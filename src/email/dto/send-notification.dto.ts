import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
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
}
