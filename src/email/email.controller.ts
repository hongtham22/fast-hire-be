import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  SendBulkNotificationDto,
  SendSingleNotificationDto,
} from '@/email/dto/send-notification.dto';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // Email templates endpoints
  @Get('templates')
  @Roles(Role.ADMIN, Role.HR)
  findAllTemplates() {
    return this.emailService.findAllTemplates();
  }

  @Get('templates/:id')
  @Roles(Role.ADMIN, Role.HR)
  findTemplateById(@Param('id') id: string) {
    return this.emailService.findTemplateById(id);
  }

  @Post('templates')
  @Roles(Role.ADMIN)
  createTemplate(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    return this.emailService.createTemplate(createEmailTemplateDto);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN)
  updateTemplate(
    @Param('id') id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailService.updateTemplate(id, updateEmailTemplateDto);
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  removeTemplate(@Param('id') id: string) {
    return this.emailService.deleteTemplate(id);
  }

  // Mail logs endpoints
  @Get('logs')
  @Roles(Role.ADMIN, Role.HR)
  findAllMailLogs() {
    return this.emailService.findAllMailLogs();
  }

  @Get('logs/:id')
  @Roles(Role.ADMIN, Role.HR)
  findLogById(@Param('id') id: string) {
    return this.emailService.findMailLogById(id);
  }

  @Get('logs/application/:applicationId')
  @Roles(Role.ADMIN, Role.HR)
  findLogsByApplication(@Param('applicationId') applicationId: string) {
    return this.emailService.findMailLogsByApplicationId(applicationId);
  }

  @Get('logs/applicant/:applicantId/job/:jobId')
  @Roles(Role.ADMIN, Role.HR)
  findLogsByApplicantAndJob(
    @Param('applicantId') applicantId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.emailService.findMailLogsByApplicantAndJob(applicantId, jobId);
  }

  @Delete('logs/:id')
  @Roles(Role.ADMIN)
  deleteMailLog(@Param('id') id: string) {
    return this.emailService.deleteMailLog(id);
  }

  @Delete('logs')
  @Roles(Role.ADMIN)
  deleteAllMailLogs(@Query('applicationId') applicationId?: string) {
    return this.emailService.deleteMailLogs(applicationId);
  }

  @Post('send-application-email')
  @Roles(Role.ADMIN, Role.HR)
  sendApplicationEmail(
    @Body()
    data: {
      applicationId: string;
      templateId: string;
      context: Record<string, any>;
    },
    @Request() req,
  ) {
    return this.emailService.sendApplicationEmail(
      data.applicationId,
      data.templateId,
      data.context,
      req.user.id,
    );
  }

  @Post('send-notification/single')
  @Roles(Role.ADMIN, Role.HR)
  async sendSingleNotification(
    @Body() dto: SendSingleNotificationDto,
    @Request() req,
  ) {
    try {
      const result = await this.emailService.sendSingleNotification(
        dto,
        req.user.id,
      );
      return { success: true, mailLog: result };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('send-notification/bulk')
  @Roles(Role.ADMIN, Role.HR)
  async sendBulkNotifications(
    @Body() dto: SendBulkNotificationDto,
    @Request() req,
  ) {
    try {
      const result = await this.emailService.sendBulkNotifications(
        dto,
        req.user.id,
      );
      return {
        success: true,
        successCount: result.successful,
        failedApplications: result.failed,
        skippedApplications: result.skipped,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('preview/:applicationId/:templateId')
  @Roles(Role.ADMIN, Role.HR)
  async previewEmail(
    @Param('applicationId') applicationId: string,
    @Param('templateId') templateId: string,
  ) {
    try {
      return await this.emailService.previewEmail(applicationId, templateId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('check-applicant-job-email/:applicantId/:jobId')
  @Roles(Role.ADMIN, Role.HR)
  async checkApplicantJobEmail(
    @Param('applicantId') applicantId: string,
    @Param('jobId') jobId: string,
  ) {
    try {
      return await this.emailService.hasApplicantReceivedEmailForJob(
        applicantId,
        jobId,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
