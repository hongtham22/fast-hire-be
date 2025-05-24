import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { JobStatus } from '../job.entity';
import { Type } from 'class-transformer';

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

  // Custom max scores for matching
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreRoleJob: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreExperienceYears: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreProgrammingLanguage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreKeyResponsibilities: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreCertificate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreLanguage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreSoftSkill: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  maxScoreTechnicalSkill: number;
}
