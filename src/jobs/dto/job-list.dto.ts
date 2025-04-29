import { JobStatus } from '../job.entity';

export class JobListItemDto {
  id: string;
  jobTitle: string;
  department: string;
  applicationCount: number;
  status: JobStatus;
  expireDate: Date | null;
  createdAt: Date;
}

export class JobListResponseDto {
  jobs: JobListItemDto[];
  total: number;
}
