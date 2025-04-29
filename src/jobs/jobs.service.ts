import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { JobListItemDto, JobListResponseDto } from './dto/job-list.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
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
}
