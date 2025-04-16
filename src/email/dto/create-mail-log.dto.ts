import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMailLogDto {
  @IsNotEmpty()
  @IsUUID()
  applicationId: string;

  @IsOptional()
  @IsUUID()
  emailTemplateId?: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsUUID()
  createdBy: string;
}
