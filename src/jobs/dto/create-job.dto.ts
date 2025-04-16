import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { JobStatus } from '../job.entity';

export class CreateJobDto {
  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @IsOptional()
  @IsUUID()
  locationId: string;

  @IsNotEmpty()
  @IsNumber()
  experienceYear: number;

  @IsNotEmpty()
  @IsString()
  mustHave: string;

  @IsOptional()
  @IsString()
  niceToHave: string;

  @IsOptional()
  @IsString()
  languageSkills: string;

  @IsOptional()
  @IsString()
  ourOffer: string;

  @IsOptional()
  @IsString()
  keyResponsibility: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status: JobStatus;

  @IsOptional()
  @IsString()
  expireDate: string;
}
