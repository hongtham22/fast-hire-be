import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';

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

  async findOne(id: string): Promise<Job | null> {
    return this.jobRepository.findOne({
      where: { id },
      relations: ['location', 'creator'],
    });
  }
}
