import { JobStatus } from '../job.entity';

export class CreatorDto {
  id: string;
  name: string;
  email: string;
}

export class JobListItemDto {
  id: string;
  jobTitle: string;
  location: string;
  applicationCount: number;
  status: JobStatus;
  expireDate: Date | null;
  createdAt: Date;
  creator?: CreatorDto;
}

export class JobListResponseDto {
  jobs: JobListItemDto[];
  total: number;
}
