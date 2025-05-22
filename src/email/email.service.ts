import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailTemplate } from './entities/email-template.entity';
import { MailLog } from './entities/mail-log.entity';
import { CreateMailLogDto } from './dto/create-mail-log.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { Application } from '@/applications/application.entity';
import { SendSingleNotificationDto, SendBulkNotificationDto } from './dto/send-notification.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class EmailService {
  private transporter: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(MailLog)
    private readonly mailLogRepository: Repository<MailLog>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectQueue('email-queue')
    private readonly emailQueue: Queue,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: this.configService.get('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  // Email template methods
  async findAllTemplates(): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find();
  }

  async findTemplateById(id: string): Promise<EmailTemplate> {
    return this.emailTemplateRepository.findOne({ where: { id } });
  }

  async createTemplate(
    createEmailTemplateDto: CreateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = this.emailTemplateRepository.create(
      createEmailTemplateDto,
    );
    return this.emailTemplateRepository.save(template);
  }

  async updateTemplate(
    id: string,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    await this.emailTemplateRepository.update(id, updateEmailTemplateDto);
    return this.findTemplateById(id);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.emailTemplateRepository.delete(id);
  }

  // Mail log methods
  async findAllMailLogs(): Promise<MailLog[]> {
    return this.mailLogRepository.find({
      relations: ['application', 'emailTemplate', 'creator'],
    });
  }

  async findMailLogById(id: string): Promise<MailLog> {
    return this.mailLogRepository.findOne({
      where: { id },
      relations: ['application', 'emailTemplate', 'creator'],
    });
  }

  async findMailLogsByApplicationId(applicationId: string): Promise<MailLog[]> {
    return this.mailLogRepository.find({
      where: { application_id: applicationId },
      relations: ['application', 'emailTemplate', 'creator'],
      order: { sent_at: 'DESC' },
    });
  }

  async createMailLog(createMailLogDto: CreateMailLogDto): Promise<MailLog> {
    const mailLog = this.mailLogRepository.create(createMailLogDto);
    return this.mailLogRepository.save(mailLog);
  }

  async deleteMailLog(id: string): Promise<void> {
    await this.mailLogRepository.delete(id);
  }

  // Template rendering
  renderTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const keys = key.trim().split('.');
      let value = context;
      
      for (const k of keys) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[k];
      }
      
      return value !== undefined && value !== null ? value : '';
    });
  }

  async sendApplicationEmail(
    applicationId: string,
    templateId: string,
    context: Record<string, any>,
    createdBy: string,
  ): Promise<MailLog> {
    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }
    // Render the template
    const subject = this.renderTemplate(template.subject_template, context);
    const message = this.renderTemplate(template.body_template, context);

    // Create a mail log
    const mailLogDto: CreateMailLogDto = {
      applicationId,
      emailTemplateId: templateId,
      subject,
      message,
      createdBy,
    };

    // TODO: Actually send the email here
    // This would integrate with your email service provider

    // Save the log
    return this.createMailLog(mailLogDto);
  }

  async sendApplicationReceivedEmail(
    application: Application,
    recipientEmail: string,
    candidateName: string,
    position: string,
  ): Promise<void> {
    try {
      // Find the template
      const template = await this.emailTemplateRepository.findOne({
        where: { name: 'Application Received' },
      });

      if (!template) {
        console.error('Email template "Application Received" not found');
        return;
      }

      // Replace placeholders in subject and body
      const subject = template.subject_template.replace(
        '{{position}}',
        position,
      );

      let body = template.body_template;
      body = body.replace('{{candidate_name}}', candidateName);
      body = body.replace(/\{\{position\}\}/g, position);

      // Send email
      const mailOptions = {
        from: this.configService.get('EMAIL_FROM'),
        to: recipientEmail,
        subject: subject,
        html: body,
      };

      await this.transporter.sendMail(mailOptions);

      // Log the email
      await this.mailLogRepository.save({
        application_id: application.id,
        email_template_id: template.id,
        subject: subject,
        message: body,
      });

      console.log(
        `Application Received email sent to ${recipientEmail} for application ${application.id}`,
      );
    } catch (error) {
      console.error(
        `Failed to send application received email: ${error.message}`,
      );
    }
  }

  /**
   * Send notification email to a single application
   */
  async sendSingleNotification(dto: SendSingleNotificationDto, userId: string): Promise<MailLog> {
    const { applicationId, templateId, markAsSent = true } = dto;
    
    // Get application with all necessary relations
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'job'],
    });
    
    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }
    
    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }
    
    // Prepare context for template rendering
    const context = {
      applicant: {
        name: application.applicant.name,
        email: application.applicant.email,
      },
      job: {
        title: application.job.jobTitle,
        department: application.job.department,
      },
      application: {
        result: application.result === true ? 'Accepted' : application.result === false ? 'Rejected' : 'Pending',
        note: application.note || '',
      },
    };
    
    // Render the template
    const subject = this.renderTemplate(template.subject_template, context);
    const message = this.renderTemplate(template.body_template, context);
    
    // Create a mail log entry
    const mailLogDto: CreateMailLogDto = {
      applicationId,
      emailTemplateId: templateId,
      subject,
      message,
      createdBy: userId,
    };
    
    // Add to queue for sending
    await this.emailQueue.add('send-email', {
      to: application.applicant.email,
      subject,
      html: message,
      mailLogDto,
    });
    
    // Update application if markAsSent is true
    if (markAsSent) {
      application.emailSent = true;
      await this.applicationRepository.save(application);
    }
    
    // Save the log
    return this.createMailLog(mailLogDto);
  }

  /**
   * Send notification emails to multiple applications
   */
  async sendBulkNotifications(dto: SendBulkNotificationDto, userId: string): Promise<{ successful: number; failed: string[] }> {
    const { applicationIds, templateId, markAsSent = true } = dto;
    
    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }
    
    const results = {
      successful: 0,
      failed: [] as string[],
    };
    
    // Process each application
    for (const applicationId of applicationIds) {
      try {
        // Get application with necessary relations
        const application = await this.applicationRepository.findOne({
          where: { id: applicationId },
          relations: ['applicant', 'job'],
        });
        
        if (!application) {
          results.failed.push(`Application with ID ${applicationId} not found`);
          continue;
        }
        
        // Prepare context for template rendering
        const context = {
          applicant: {
            name: application.applicant.name,
            email: application.applicant.email,
          },
          job: {
            title: application.job.jobTitle,
            department: application.job.department,
          },
          application: {
            result: application.result === true ? 'Accepted' : application.result === false ? 'Rejected' : 'Pending',
            note: application.note || '',
          },
        };
        
        // Render the template
        const subject = this.renderTemplate(template.subject_template, context);
        const message = this.renderTemplate(template.body_template, context);
        
        // Create a mail log entry
        const mailLogDto: CreateMailLogDto = {
          applicationId,
          emailTemplateId: templateId,
          subject,
          message,
          createdBy: userId,
        };
        
        // Add to queue for sending
        await this.emailQueue.add('send-email', {
          to: application.applicant.email,
          subject,
          html: message,
          mailLogDto,
        });
        
        // Update application if markAsSent is true
        if (markAsSent) {
          application.emailSent = true;
          await this.applicationRepository.save(application);
        }
        
        // Save the log
        await this.createMailLog(mailLogDto);
        
        results.successful++;
      } catch (error) {
        console.error(`Failed to send email for application ${applicationId}:`, error);
        results.failed.push(`Application ${applicationId}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Preview an email template with application context
   */
  async previewEmail(applicationId: string, templateId: string): Promise<{ subject: string; body: string }> {
    // Get application with all necessary relations
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'job'],
    });
    
    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }
    
    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }
    
    // Prepare context for template rendering
    const context = {
      applicant: {
        name: application.applicant.name,
        email: application.applicant.email,
      },
      job: {
        title: application.job.jobTitle,
        department: application.job.department,
      },
      application: {
        result: application.result === true ? 'Accepted' : application.result === false ? 'Rejected' : 'Pending',
        note: application.note || '',
      },
    };
    
    // Render the template
    const subject = this.renderTemplate(template.subject_template, context);
    const body = this.renderTemplate(template.body_template, context);
    
    return { subject, body };
  }
}
