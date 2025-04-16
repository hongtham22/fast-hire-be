import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  subjectTemplate: string;

  @IsNotEmpty()
  @IsString()
  bodyTemplate: string;
}
