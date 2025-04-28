import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsNotEmpty()
  @IsUUID()
  applicantId: string;

  @IsNotEmpty()
  @IsUUID()
  jobId: string;
}
