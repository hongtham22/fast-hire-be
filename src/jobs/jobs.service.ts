import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { JobListItemDto, JobListResponseDto } from './dto/job-list.dto';
import { JDKeyword } from '../jd_keywords/jd-keyword.entity';
import { JDCategory } from '../jd_keywords/jd-category.entity';
import { JDKeywordCategory } from '../jd_keywords/jd-keyword-category.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import axios from 'axios';
import { EmailService } from '../email/email.service';
import { Application } from '../applications/application.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(JDKeyword)
    private readonly jdKeywordRepository: Repository<JDKeyword>,
    @InjectRepository(JDCategory)
    private readonly jdCategoryRepository: Repository<JDCategory>,
    @InjectRepository(JDKeywordCategory)
    private readonly jdKeywordCategoryRepository: Repository<JDKeywordCategory>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly emailService: EmailService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    try {
      const job = this.jobRepository.create(createJobDto);
      return await this.jobRepository.save(job);
    } catch (error) {
      console.error('Error creating job:', error);
      throw new HttpException(
        `Failed to create job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateMaxScores(jobData: CreateJobDto | UpdateJobDto): void {
    const hasMaxScores = [
      'maxScoreRoleJob',
      'maxScoreExperienceYears',
      'maxScoreProgrammingLanguage',
      'maxScoreKeyResponsibilities',
      'maxScoreCertificate',
      'maxScoreLanguage',
      'maxScoreSoftSkill',
      'maxScoreTechnicalSkill',
    ].some((field) => field in jobData && jobData[field] !== undefined);

    // If no max scores are provided, no need to validate
    if (!hasMaxScores) {
      return;
    }

    // Get default values from entity
    const defaultValues = {
      maxScoreRoleJob: 10,
      maxScoreExperienceYears: 15,
      maxScoreProgrammingLanguage: 15,
      maxScoreKeyResponsibilities: 15,
      maxScoreCertificate: 10,
      maxScoreLanguage: 10,
      maxScoreSoftSkill: 10,
      maxScoreTechnicalSkill: 15,
    };

    // Compute the total from provided values or defaults
    const total = [
      'maxScoreRoleJob',
      'maxScoreExperienceYears',
      'maxScoreProgrammingLanguage',
      'maxScoreKeyResponsibilities',
      'maxScoreCertificate',
      'maxScoreLanguage',
      'maxScoreSoftSkill',
      'maxScoreTechnicalSkill',
    ].reduce((sum, field) => {
      const value =
        jobData[field] !== undefined
          ? Number(jobData[field])
          : hasMaxScores
            ? 0
            : defaultValues[field];
      return sum + value;
    }, 0);

    if (Math.round(total) !== 100) {
      throw new HttpException(
        `Total max score must be 100. Current total: ${total}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createWithAuthenticatedUser(
    createJobDto: CreateJobDto,
    userId: string,
  ): Promise<Job> {
    try {
      // Validate max scores
      this.validateMaxScores(createJobDto);

      // Create job with authenticated user ID
      const job = this.jobRepository.create({
        ...createJobDto,
        createdBy: userId,
      });

      return this.jobRepository.save(job);
    } catch (error) {
      console.error('Error creating job with authenticated user:', error);
      throw new HttpException(
        error.message || 'Failed to create job',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOpenJobs(options?: {
    page?: number;
    limit?: number;
    locationId?: string;
    query?: string;
  }): Promise<{ jobs: Job[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 4;
    const skip = (page - 1) * limit;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.location', 'location')
      .leftJoinAndSelect('job.creator', 'creator')
      .where('job.status != :closedStatus', { closedStatus: JobStatus.CLOSED })
      .andWhere('job.status = :approvedStatus', {
        approvedStatus: JobStatus.APPROVED,
      });

    if (options?.locationId) {
      queryBuilder.andWhere('job.locationId = :locationId', {
        locationId: options.locationId,
      });
    }

    queryBuilder.andWhere('(job.expireDate IS NULL OR job.expireDate > NOW())');

    if (options?.query) {
      queryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    queryBuilder.orderBy('job.createdAt', 'DESC');

    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return { jobs, total };
  }

  async findAllJobsForHR(options?: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    query?: string;
    userId?: string;
  }): Promise<JobListResponseDto> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query with left join to applications to count them
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.applications', 'application')
      .leftJoinAndSelect('job.location', 'location')
      .leftJoinAndSelect('job.creator', 'creator')
      .select([
        'job.id',
        'job.jobTitle',
        'job.status',
        'job.createdAt',
        'job.expireDate',
        'location.name',
        'creator.id',
        'creator.name',
        'creator.email',
      ])
      .addSelect('COUNT(application.id)', 'applicationCount')
      .groupBy('job.id')
      .addGroupBy('location.id')
      .addGroupBy('creator.id');

    // Filter by HR user ID - HR can only see their own jobs
    if (options?.userId) {
      queryBuilder.andWhere('job.createdBy = :userId', {
        userId: options.userId,
      });
    }

    // Apply status filter if provided
    if (options?.status) {
      queryBuilder.andWhere('job.status = :status', {
        status: options.status,
      });
    }

    // Apply search filter if provided
    if (options?.query) {
      queryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    // Apply pagination
    queryBuilder.orderBy('job.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    // Execute the query with getRawAndEntities to get both raw and mapped entities
    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // Get the total count with same filters
    const countQueryBuilder = this.jobRepository.createQueryBuilder('job');

    if (options?.userId) {
      countQueryBuilder.andWhere('job.createdBy = :userId', {
        userId: options.userId,
      });
    }

    if (options?.status) {
      countQueryBuilder.andWhere('job.status = :status', {
        status: options.status,
      });
    }

    if (options?.query) {
      countQueryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    const total = await countQueryBuilder.getCount();

    // Transform the results, mapping applicationCount correctly from raw results
    const jobs = entities.map((job, index) => {
      const applicationCount = Number(raw[index]?.applicationCount || 0);
      return {
        id: job.id,
        jobTitle: job.jobTitle,
        location: job.location?.name || 'General',
        applicationCount,
        status: job.status,
        expireDate: job.expireDate,
        createdAt: job.createdAt,
        creator: job.creator
          ? {
              id: job.creator.id,
              name: job.creator.name,
              email: job.creator.email,
            }
          : undefined,
      } as JobListItemDto;
    });

    return {
      jobs,
      total,
    };
  }

  async findAllJobsForAdmin(options?: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    query?: string;
  }): Promise<JobListResponseDto> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query with left join to applications to count them
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.applications', 'application')
      .leftJoinAndSelect('job.location', 'location')
      .leftJoinAndSelect('job.creator', 'creator')
      .select([
        'job.id',
        'job.jobTitle',
        'job.status',
        'job.createdAt',
        'job.expireDate',
        'location.name',
        'creator.id',
        'creator.name',
        'creator.email',
      ])
      .addSelect('COUNT(application.id)', 'applicationCount')
      .groupBy('job.id')
      .addGroupBy('location.id')
      .addGroupBy('creator.id');

    if (options?.status) {
      queryBuilder.andWhere('job.status = :status', {
        status: options.status,
      });
    }

    if (options?.query) {
      queryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    queryBuilder.orderBy('job.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    const countQueryBuilder = this.jobRepository.createQueryBuilder('job');

    if (options?.status) {
      countQueryBuilder.andWhere('job.status = :status', {
        status: options.status,
      });
    }

    if (options?.query) {
      countQueryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    const total = await countQueryBuilder.getCount();

    const jobs = entities.map((job, index) => {
      const applicationCount = Number(raw[index]?.applicationCount || 0);
      return {
        id: job.id,
        jobTitle: job.jobTitle,
        location: job.location?.name || 'General',
        applicationCount,
        status: job.status,
        expireDate: job.expireDate,
        createdAt: job.createdAt,
        creator: job.creator
          ? {
              id: job.creator.id,
              name: job.creator.name,
              email: job.creator.email,
            }
          : undefined,
      } as JobListItemDto;
    });

    return {
      jobs,
      total,
    };
  }

  async findOne(id: string): Promise<Job | null> {
    try {
      const job = await this.jobRepository.findOne({
        where: { id },
        relations: [
          'location',
          'creator',
          'applications',
          'applications.applicant',
        ],
      });

      if (job && job.applications) {
        (job as any).applicationCount = job.applications.length;
      }

      return job;
    } catch (error) {
      console.error(`Error fetching job with ID ${id}:`, error);
      throw new HttpException(
        `Failed to fetch job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getJDKeywords(jobId: string) {
    const jdKeyword = await this.jdKeywordRepository.findOne({
      where: { jobId },
      relations: ['categories', 'categories.category'],
    });

    if (!jdKeyword) {
      return null;
    }

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    const result = {};

    for (const category of jdKeyword.categories) {
      result[category.category.name] = category.value;
    }

    // Add custom max scores from the job table
    if (job) {
      result['custom_max_scores'] = {
        role_job: job.maxScoreRoleJob,
        experience_years: job.maxScoreExperienceYears,
        programming_language: job.maxScoreProgrammingLanguage,
        key_responsibilities: job.maxScoreKeyResponsibilities,
        certificate: job.maxScoreCertificate,
        language: job.maxScoreLanguage,
        soft_skill: job.maxScoreSoftSkill,
        technical_skill: job.maxScoreTechnicalSkill,
      };
    }

    return result;
  }

  async extractAndStoreJDKeywords(jobId: string): Promise<JDKeyword> {
    const existingKeyword = await this.jdKeywordRepository.findOne({
      where: { jobId },
      relations: ['categories'],
    });

    if (existingKeyword) {
      await this.jdKeywordCategoryRepository.delete({
        jdKeywordId: existingKeyword.id,
      });
      await this.jdKeywordRepository.delete({ id: existingKeyword.id });
    }

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['location'],
    });

    if (!job) {
      throw new HttpException('Job does not exist', HttpStatus.NOT_FOUND);
    }

    const requestData = {
      jobTitle: job.jobTitle,
      experienceYears: job.experienceYear.toString(),
      keyResponsibilities: job.keyResponsibility || '',
      mustHave: job.mustHave || '',
      niceToHave: job.niceToHave || '',
      languageSkills: job.languageSkills || '',
    };

    const apiUrl = `${this.configService.get('FLASK_API_URL')}/parse-jd`;

    console.log('Starting request to Flask API:', new Date().toISOString());
    console.log(
      'Job data:',
      JSON.stringify(requestData).substring(0, 500) + '...',
    );

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `Attempt ${attempt}/${MAX_RETRIES} - Sending request to: ${apiUrl}`,
        );

        const startTime = Date.now();
        const response = await axios.post(apiUrl, requestData, {
          timeout: 120000, // 2 minutes
          headers: { 'Content-Type': 'application/json' },
        });
        const endTime = Date.now();

        console.log(
          `Request successful after ${(endTime - startTime) / 1000}s`,
        );
        console.log('Response status:', response.status);

        const keywordData = response.data;

        // Process data if request is successful
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const jdKeyword = new JDKeyword();
          jdKeyword.jobId = jobId;
          const savedJDKeyword = await queryRunner.manager.save(jdKeyword);

          const categories = [
            'certificate',
            'education',
            'experience_years',
            'key_responsibilities',
            'language',
            'programming_language',
            'role_job',
            'soft_skill',
            'technical_skill',
          ];

          for (const categoryName of categories) {
            let category = await this.jdCategoryRepository.findOne({
              where: { name: categoryName },
            });

            if (!category) {
              category = new JDCategory();
              category.name = categoryName;
              category = await queryRunner.manager.save(category);
            }

            const jdKeywordCategory = new JDKeywordCategory();
            jdKeywordCategory.jdKeywordId = savedJDKeyword.id;
            jdKeywordCategory.categoryId = category.id;

            let value = keywordData[categoryName];

            if (value === null || value === undefined) {
              if (
                categoryName === 'role_job' ||
                categoryName === 'experience_years'
              ) {
                value = { requirement_type: 'nice_to_have', value: '' };
              } else {
                value = [];
              }
            }

            jdKeywordCategory.value = value;

            await queryRunner.manager.save(jdKeywordCategory);
          }

          await queryRunner.commitTransaction();

          return this.jdKeywordRepository.findOne({
            where: { id: savedJDKeyword.id },
            relations: ['categories', 'categories.category'],
          });
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw new HttpException(
            `Error storing JD keywords: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        } finally {
          await queryRunner.release();
        }

        // If request is successful, exit the loop
        break;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed: ${error.message}`);

        // If it's not a timeout error or we've tried the maximum times, throw the error
        if (error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT') {
          if (error.code === 'ECONNREFUSED') {
            throw new HttpException(
              'Cannot connect to Flask API. Please check the Flask API.',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }
          throw new HttpException(
            `Error calling parse-jd API: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        // If there are retries left, wait a bit before trying again
        if (attempt < MAX_RETRIES) {
          const waitTime = 2000 * attempt; // Increase wait time based on attempt count
          console.log(`Waiting ${waitTime}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // If all attempts fail
    if (lastError) {
      throw new HttpException(
        `Timeout after ${MAX_RETRIES} attempts: ${lastError.message}`,
        HttpStatus.REQUEST_TIMEOUT,
      );
    }
  }

  async processAllJobsForKeywords(): Promise<{
    processed: number;
    skipped: number;
  }> {
    const jobs = await this.jobRepository.find({
      where: { status: JobStatus.APPROVED },
    });

    let processed = 0;
    let skipped = 0;

    for (const job of jobs) {
      const existingKeyword = await this.jdKeywordRepository.findOne({
        where: { jobId: job.id },
      });

      if (existingKeyword) {
        skipped++;
        continue;
      }

      // Process job without keywords
      await this.extractAndStoreJDKeywords(job.id);
      processed++;
    }

    return { processed, skipped };
  }

  async deleteJobWithKeywords(jobId: string): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
      });

      if (!job) {
        throw new HttpException(
          `Job with ID ${jobId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const applications = await this.applicationRepository.find({
        where: { jobId },
      });

      for (const application of applications) {
        await this.emailService.deleteMailLogs(application.id);
      }

      // Delete all applications for this job
      if (applications.length > 0) {
        await queryRunner.manager.delete(
          Application,
          applications.map((app) => app.id),
        );
      }

      // Find the JD keyword entry for this job
      const jdKeyword = await this.jdKeywordRepository.findOne({
        where: { jobId },
        relations: ['categories'],
      });

      if (jdKeyword) {
        if (jdKeyword.categories && jdKeyword.categories.length > 0) {
          await queryRunner.manager.delete(
            JDKeywordCategory,
            jdKeyword.categories.map((category) => category.id),
          );
        }

        await queryRunner.manager.delete(JDKeyword, jdKeyword.id);
      }

      await queryRunner.manager.delete(Job, jobId);

      await queryRunner.commitTransaction();

      return {
        message: `Job with ID ${jobId} and its related data successfully deleted`,
      };
    } catch (error) {
      // Rollback transaction in case of error
      await queryRunner.rollbackTransaction();

      console.error(`Error deleting job with ID ${jobId}:`, error);
      throw new HttpException(
        error.message || `Failed to delete job with ID ${jobId}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    try {
      const existingJob = await this.jobRepository.findOne({
        where: { id },
      });

      if (!existingJob) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      this.validateMaxScores(updateJobDto);

      await this.jobRepository.update(id, updateJobDto);

      return this.jobRepository.findOne({
        where: { id },
        relations: ['location'],
      });
    } catch (error) {
      console.error(`Error updating job with ID ${id}:`, error);
      throw new HttpException(
        error.message || `Failed to update job with ID ${id}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findExpiredJobs(): Promise<Job[]> {
    try {
      const currentDate = new Date();

      return this.jobRepository
        .find({
          where: {
            status: JobStatus.APPROVED,
            expireDate: Not(IsNull()),
          },
          relations: ['location'],
        })
        .then((jobs) => jobs.filter((job) => job.expireDate < currentDate));
    } catch (error) {
      console.error('Error finding expired jobs:', error);
      throw new HttpException(
        `Failed to find expired jobs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async closeJob(jobId: string, reason: 'manual' | 'expired'): Promise<Job> {
    try {
      const job = await this.findOne(jobId);

      if (!job) {
        throw new HttpException(
          `Job with ID ${jobId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      job.status = JobStatus.CLOSED;
      job.closeReason = reason;

      return this.jobRepository.save(job);
    } catch (error) {
      console.error(`Error closing job ${jobId}:`, error);
      throw new HttpException(
        `Failed to close job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
