import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { JobListItemDto, JobListResponseDto } from './dto/job-list.dto';
import { JDKeyword } from '../jd_keywords/jd-keyword.entity';
import { JDCategory } from '../jd_keywords/jd-category.entity';
import { JDKeywordCategory } from '../jd_keywords/jd-keyword-category.entity';
import { CreateJobDto } from './dto/create-job.dto';
import axios from 'axios';

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
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new job
   * @param createJobDto - The DTO with job information
   * @returns The created job
   */
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

  /**
   * Create a new job with default HR user
   * @param createJobDto - The DTO with job information
   * @returns The created job
   */
  async createWithDefaultHR(createJobDto: CreateJobDto): Promise<Job> {
    try {
      // Get the default HR user
      const hrUser = await this.dataSource.query(
        `SELECT id FROM users WHERE email = 'hr@fasthire.com' LIMIT 1`,
      );

      if (!hrUser || hrUser.length === 0) {
        throw new HttpException(
          'Default HR user not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Add the createdBy field to the DTO
      const jobData = {
        ...createJobDto,
        createdBy: hrUser[0].id,
      };

      const job = this.jobRepository.create(jobData);
      return await this.jobRepository.save(job);
    } catch (error) {
      console.error('Error creating job with default HR:', error);
      throw new HttpException(
        `Failed to create job: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all open jobs (status not CLOSED)
   * @param options Filtering and pagination options
   * @returns List of open jobs
   */
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

    // If filtering by location
    if (options?.locationId) {
      queryBuilder.andWhere('job.locationId = :locationId', {
        locationId: options.locationId,
      });
    }

    // Add expiration date filtering condition
    queryBuilder.andWhere('(job.expireDate IS NULL OR job.expireDate > NOW())');

    // Add search condition by title
    if (options?.query) {
      // case insensitive search
      queryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    // Sort by creation date (newest first)
    queryBuilder.orderBy('job.createdAt', 'DESC');

    // Add pagination
    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return { jobs, total };
  }

  /**
   * Get all jobs for HR with application count
   * @param options Filtering and pagination options
   * @returns List of jobs and related information
   */
  async findAllJobsForHR(options?: {
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
      .select([
        'job.id',
        'job.jobTitle',
        'job.status',
        'job.createdAt',
        'job.expireDate',
        'location.name',
      ])
      .addSelect('COUNT(application.id)', 'applicationCount')
      .groupBy('job.id')
      .addGroupBy('location.id');

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

    // Get the total count
    const total = await this.jobRepository.count({
      where: options?.status ? { status: options.status } : {},
    });

    // Transform the results, mapping applicationCount correctly from raw results
    const jobs = entities.map((job, index) => {
      const applicationCount = Number(raw[index]?.applicationCount || 0);
      return {
        id: job.id,
        jobTitle: job.jobTitle,
        department: job.location?.name || 'General',
        applicationCount,
        status: job.status,
        expireDate: job.expireDate,
        createdAt: job.createdAt,
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

  /**
   * Get JD keywords for a job
   * @param jobId - ID of the job to get keywords for
   * @returns JD keyword information for the job
   */
  async getJDKeywords(jobId: string) {
    const jdKeyword = await this.jdKeywordRepository.findOne({
      where: { jobId },
      relations: ['categories', 'categories.category'],
    });

    if (!jdKeyword) {
      return null;
    }

    // Restructure data to match the expected format in the frontend
    const result = {};

    for (const category of jdKeyword.categories) {
      result[category.category.name] = category.value;
    }

    return result;
  }

  /**
   * Extract and store keyword information from job description
   * @param jobId - ID of the job to extract keywords for
   * @returns Stored JD keyword information
   */
  async extractAndStoreJDKeywords(jobId: string): Promise<JDKeyword> {
    // Check if job already has keywords
    const existingKeyword = await this.jdKeywordRepository.findOne({
      where: { jobId },
      relations: ['categories'],
    });

    if (existingKeyword) {
      return existingKeyword;
    }

    // Get detailed job information
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['location'],
    });

    if (!job) {
      throw new HttpException('Job does not exist', HttpStatus.NOT_FOUND);
    }

    const requestData = {
      jobTitle: job.jobTitle,
      location: job.location?.name || '',
      experienceYears: job.experienceYear.toString(),
      keyResponsibilities: job.keyResponsibility || '',
      mustHave: job.mustHave || '',
      niceToHave: job.niceToHave || '',
      languageSkills: job.languageSkills || '',
    };

    const apiUrl = 'http://host.docker.internal:5000/parse-jd';

    // Add detailed logging
    console.log('Starting request to Flask API:', new Date().toISOString());
    console.log(
      'Job data:',
      JSON.stringify(requestData).substring(0, 500) + '...',
    );

    // Use retry function for timeout handling
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

        console.log(`Request successful after ${(endTime - startTime) / 1000}s`);
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

  /**
   * Extract and store keywords for all jobs that don't have keywords yet
   * @returns List of processed jobs
   */
  async processAllJobsForKeywords(): Promise<{
    processed: number;
    skipped: number;
  }> {
    // Get all approved jobs
    const jobs = await this.jobRepository.find({
      where: { status: JobStatus.APPROVED },
    });

    let processed = 0;
    let skipped = 0;

    // Check if each job already has keywords
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

  /**
   * Delete a job and all of its related JD keywords
   * @param jobId - The ID of the job to delete
   * @returns Message indicating successful deletion
   */
  async deleteJobWithKeywords(jobId: string): Promise<{ message: string }> {
    // Create a query runner for transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First, check if the job exists
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
      });

      if (!job) {
        throw new HttpException(
          `Job with ID ${jobId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Find the JD keyword entry for this job
      const jdKeyword = await this.jdKeywordRepository.findOne({
        where: { jobId },
        relations: ['categories'],
      });

      if (jdKeyword) {
        // Delete all JDKeywordCategory entries first (due to foreign key constraints)
        if (jdKeyword.categories && jdKeyword.categories.length > 0) {
          await queryRunner.manager.delete(
            JDKeywordCategory,
            jdKeyword.categories.map((category) => category.id),
          );
        }

        // Then delete the JDKeyword entry
        await queryRunner.manager.delete(JDKeyword, jdKeyword.id);
      }

      // Finally, delete the job
      await queryRunner.manager.delete(Job, jobId);

      // Commit the transaction
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
}
