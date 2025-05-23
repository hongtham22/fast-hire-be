import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendSingleNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  applicationId: string;

  @IsNotEmpty()
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  markAsSent?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class SendBulkNotificationDto {
  @IsNotEmpty()
  @IsArray()
  applicationIds: string[];

  @IsNotEmpty()
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsBoolean()
  markAsSent?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;
}
