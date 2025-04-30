import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { JobListItemDto, JobListResponseDto } from './dto/job-list.dto';
import { JDKeyword } from '../jd_keywords/jd-keyword.entity';
import { JDCategory } from '../jd_keywords/jd-category.entity';
import { JDKeywordCategory } from '../jd_keywords/jd-keyword-category.entity';
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
   * Lấy danh sách tất cả các job đang mở (status khác CLOSED)
   * @param options Các tùy chọn lọc và phân trang
   * @returns Danh sách job đang mở
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

    // Nếu có filter theo location
    if (options?.locationId) {
      queryBuilder.andWhere('job.locationId = :locationId', {
        locationId: options.locationId,
      });
    }

    // Thêm điều kiện lọc ngày hết hạn
    queryBuilder.andWhere('(job.expireDate IS NULL OR job.expireDate > NOW())');

    // Thêm điều kiện tìm kiếm theo title
    if (options?.query) {
      // in hoa in đậm không phân biệt, chữ viết hoa viết thường không phân biệt
      queryBuilder.andWhere('job.jobTitle ILIKE :query', {
        query: `%${options.query}%`,
      });
    }

    // Sắp xếp theo ngày tạo mới nhất
    queryBuilder.orderBy('job.createdAt', 'DESC');

    // Thêm phân trang
    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return { jobs, total };
  }

  /**
   * Lấy danh sách tất cả các job cho HR kèm theo số lượng application
   * @param options Các tùy chọn lọc và phân trang
   * @returns Danh sách job và thông tin liên quan
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
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['location', 'creator', 'applications'],
    });

    if (job && job.applications) {
      (job as any).applicationCount = job.applications.length;
    }

    return job;
  }

  /**
   * Lấy thông tin JD keywords của một job
   * @param jobId - ID của job cần lấy keywords
   * @returns Thông tin JD keyword của job
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
   * Trích xuất và lưu trữ thông tin keyword từ job description
   * @param jobId - ID của job cần trích xuất keyword
   * @returns Thông tin JD keyword đã được lưu trữ
   */
  async extractAndStoreJDKeywords(jobId: string): Promise<JDKeyword> {
    // Kiểm tra nếu job đã có keywords
    const existingKeyword = await this.jdKeywordRepository.findOne({
      where: { jobId },
      relations: ['categories'],
    });

    if (existingKeyword) {
      return existingKeyword;
    }

    // Lấy thông tin chi tiết của job
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['location'],
    });

    if (!job) {
      throw new HttpException('Job không tồn tại', HttpStatus.NOT_FOUND);
    }

    const requestData = {
      jobTitle: job.jobTitle,
      location: job.location?.name || '',
      jobType: 'Full-time',
      experienceYears: job.experienceYear.toString(),
      keyResponsibilities: job.keyResponsibility || '',
      mustHave: job.mustHave || '',
      niceToHave: job.niceToHave || '',
      languageSkills: job.languageSkills || '',
    };

    const apiUrl = 'http://host.docker.internal:5000/parse-jd';

    // Thêm logging chi tiết
    console.log('Bắt đầu gửi request đến Flask API:', new Date().toISOString());
    console.log(
      'Job data:',
      JSON.stringify(requestData).substring(0, 500) + '...',
    );

    // Sử dụng hàm retry để thử lại nếu timeout
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `Attempt ${attempt}/${MAX_RETRIES} - Gửi request đến: ${apiUrl}`,
        );

        const startTime = Date.now();
        const response = await axios.post(apiUrl, requestData, {
          timeout: 120000, // 2 phút
          headers: { 'Content-Type': 'application/json' },
        });
        const endTime = Date.now();

        console.log(`Request thành công sau ${(endTime - startTime) / 1000}s`);
        console.log('Response status:', response.status);

        const keywordData = response.data;

        // Xử lý dữ liệu nếu request thành công
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
            'programing_langugue',
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
            `Lỗi khi lưu trữ JD keywords: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        } finally {
          await queryRunner.release();
        }

        // Nếu request thành công, thoát khỏi vòng lặp
        break;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed: ${error.message}`);

        // Nếu không phải là lỗi timeout hoặc đã thử hết số lần, thì throw lỗi
        if (error.code !== 'ECONNABORTED' && error.code !== 'ETIMEDOUT') {
          if (error.code === 'ECONNREFUSED') {
            throw new HttpException(
              'Không thể kết nối đến API Flask. Vui lòng kiểm tra Flask API.',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }
          throw new HttpException(
            `Lỗi khi gọi API parse-jd: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        // Nếu còn lần retry, đợi một chút trước khi thử lại
        if (attempt < MAX_RETRIES) {
          const waitTime = 2000 * attempt; // Tăng thời gian chờ theo số lần thử
          console.log(`Đợi ${waitTime}ms trước khi thử lại...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // Nếu đã thử hết số lần mà vẫn thất bại
    if (lastError) {
      throw new HttpException(
        `Lỗi timeout sau ${MAX_RETRIES} lần thử: ${lastError.message}`,
        HttpStatus.REQUEST_TIMEOUT,
      );
    }
  }

  /**
   * Trích xuất và lưu trữ keywords cho tất cả các job chưa có keyword
   * @returns Danh sách job đã được xử lý
   */
  async processAllJobsForKeywords(): Promise<{
    processed: number;
    skipped: number;
  }> {
    // Lấy tất cả các job đã được phê duyệt
    const jobs = await this.jobRepository.find({
      where: { status: JobStatus.APPROVED },
    });

    let processed = 0;
    let skipped = 0;

    // Kiểm tra từng job đã có keyword chưa
    for (const job of jobs) {
      const existingKeyword = await this.jdKeywordRepository.findOne({
        where: { jobId: job.id },
      });

      if (existingKeyword) {
        skipped++;
        continue;
      }

      // Xử lý job chưa có keyword
      await this.extractAndStoreJDKeywords(job.id);
      processed++;
    }

    return { processed, skipped };
  }
}
