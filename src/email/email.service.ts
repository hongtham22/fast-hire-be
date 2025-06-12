import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailTemplate } from './entities/email-template.entity';
import { MailLog } from './entities/mail-log.entity';
import { CreateMailLogDto } from './dto/create-mail-log.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { Application } from '../applications/application.entity';
import {
  SendSingleNotificationDto,
  SendBulkNotificationDto,
} from './dto/send-notification.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import Mailjet from 'node-mailjet';

@Injectable()
export class EmailService {
  private mailjet: any;

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
    // Initialize Mailjet
    const mailjetApiKey = this.configService.get('MAILJET_API_KEY');
    const mailjetSecretKey = this.configService.get('MAILJET_SECRET_KEY');

    console.log('Mailjet configuration:', {
      hasApiKey: !!mailjetApiKey,
      hasSecretKey: !!mailjetSecretKey,
      apiKeyLength: mailjetApiKey ? mailjetApiKey.length : 0,
    });

    if (mailjetApiKey && mailjetSecretKey) {
      this.mailjet = Mailjet.apiConnect(mailjetApiKey, mailjetSecretKey);
      console.log('Mailjet client initialized successfully');
    } else {
      console.error('Mailjet credentials not found in environment variables');
      console.error('Required: MAILJET_API_KEY and MAILJET_SECRET_KEY');
    }
  }

  /**
   * Send email using Mailjet API
   */
  private async sendMailjetEmail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<any> {
    if (!this.mailjet) {
      throw new Error(
        'Mailjet client not initialized. Check your API credentials.',
      );
    }

    try {
      console.log(`Mailjet: Sending email to ${options.to}`);

      const request = this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: options.from,
              Name: 'FastHire System',
            },
            To: [
              {
                Email: options.to,
              },
            ],
            Subject: options.subject,
            HTMLPart: options.html,
            TextPart: options.text || '',
          },
        ],
      });

      const result = await request;
      console.log(` Mailjet: Email sent successfully`, {
        messageId: result.body?.Messages?.[0]?.To?.[0]?.MessageID,
        status: result.body?.Messages?.[0]?.Status,
      });

      return result;
    } catch (error) {
      console.error(` Mailjet: Failed to send email:`, {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response?.text,
      });
      throw error;
    }
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

  /**
   * Get mail logs for all applications of a specific applicant and job
   * This returns only RESULT emails (accepted/rejected/interview), excluding automatic "Application Received" emails
   */
  async findMailLogsByApplicantAndJob(
    applicantId: string,
    jobId: string,
  ): Promise<MailLog[]> {
    // First get all applications for this applicant and job
    const applications = await this.getApplicantJobApplications(
      applicantId,
      jobId,
    );

    if (applications.length === 0) {
      return [];
    }

    // Get all mail logs for these applications
    const applicationIds = applications.map((app) => app.id);

    // Get all mail logs, then filter out "Application Received" emails
    const allMailLogs = await this.mailLogRepository.find({
      where: {
        application_id:
          applicationIds.length === 1 ? applicationIds[0] : In(applicationIds),
      },
      relations: ['application', 'emailTemplate', 'creator'],
      order: { sent_at: 'DESC' },
    });

    // Filter out "Application Received" emails - only show result emails
    return allMailLogs.filter(
      (log) => log.emailTemplate?.name !== 'Application Received',
    );
  }

  async createMailLog(createMailLogDto: CreateMailLogDto): Promise<MailLog> {
    const mailLog = this.mailLogRepository.create({
      application_id: createMailLogDto.applicationId,
      email_template_id: createMailLogDto.emailTemplateId,
      subject: createMailLogDto.subject,
      message: createMailLogDto.message,
      created_by: createMailLogDto.createdBy,
    });
    return this.mailLogRepository.save(mailLog);
  }

  async deleteMailLog(id: string): Promise<void> {
    await this.mailLogRepository.delete(id);
  }

  /**
   * Delete all mail logs or logs for a specific application
   * @param applicationId Optional: Delete logs only for a specific application
   */
  async deleteMailLogs(applicationId?: string): Promise<void> {
    if (applicationId) {
      await this.mailLogRepository.delete({ application_id: applicationId });
    } else {
      await this.mailLogRepository.delete({});
    }
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

      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Get all applications for a specific applicant and job
   * @param applicantId - ID of the applicant
   * @param jobId - ID of the job
   * @returns Array of applications sorted by submission date (newest first)
   */
  private async getApplicantJobApplications(
    applicantId: string,
    jobId: string,
  ): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { applicantId, jobId },
      relations: ['applicant', 'job'],
      order: { submittedAt: 'DESC' }, // Latest first
    });
  }

  /**
   * Check if an applicant has already received a RESULT email for a specific job
   * This method only checks for final result emails (accepted/rejected), not "Application Received" emails
   * @param applicantId - ID of the applicant
   * @param jobId - ID of the job
   * @returns Object indicating if result email was sent and details
   */
  async hasApplicantReceivedEmailForJob(
    applicantId: string,
    jobId: string,
  ): Promise<{
    hasReceived: boolean;
    emailType?: string;
    sentAt?: Date;
    applicationId?: string;
  }> {
    const applications = await this.getApplicantJobApplications(
      applicantId,
      jobId,
    );

    // Get all mail logs for all applications of this applicant + job combination
    const allMailLogs = [];
    for (const app of applications) {
      const mailLogs = await this.mailLogRepository.find({
        where: { application_id: app.id },
        relations: ['emailTemplate'],
        order: { sent_at: 'DESC' },
      });

      // Add application info to each mail log for reference
      mailLogs.forEach((log) => {
        allMailLogs.push({
          ...log,
          applicationId: app.id,
          applicationEmailSent: app.emailSent,
        });
      });
    }

    // Sort all mail logs by sent_at DESC to get the most recent first
    allMailLogs.sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    );

    // Look for the most recent RESULT email (not "Application Received")
    const resultTemplateNames = [
      'Application Accepted',
      'Application Rejected',
      'Interview Invitation',
    ];

    for (const mailLog of allMailLogs) {
      const templateName = mailLog.emailTemplate?.name;
      if (templateName && resultTemplateNames.includes(templateName)) {
        return {
          hasReceived: true,
          emailType: templateName,
          sentAt: mailLog.sent_at,
          applicationId: mailLog.applicationId,
        };
      }
    }

    // Also check the emailSent flag as backup (for cases where mail logs might be missing)
    for (const app of applications) {
      if (app.emailSent) {
        // If emailSent=true but no result email found in logs, assume last mail log is the result
        const mailLogs = await this.mailLogRepository.find({
          where: { application_id: app.id },
          relations: ['emailTemplate'],
          order: { sent_at: 'DESC' },
        });

        if (mailLogs.length > 0) {
          const lastLog = mailLogs[0];
          // Skip "Application Received" emails
          if (lastLog.emailTemplate?.name !== 'Application Received') {
            return {
              hasReceived: true,
              emailType: lastLog.emailTemplate?.name || 'Unknown Result Email',
              sentAt: lastLog.sent_at,
              applicationId: app.id,
            };
          }
        }
      }
    }

    return { hasReceived: false };
  }

  /**
   * Mark all applications for a specific applicant and job as email sent
   * @param applicantId - ID of the applicant
   * @param jobId - ID of the job
   */
  private async markAllApplicantJobApplicationsAsEmailSent(
    applicantId: string,
    jobId: string,
  ): Promise<void> {
    const applications = await this.getApplicantJobApplications(
      applicantId,
      jobId,
    );

    for (const app of applications) {
      app.emailSent = true;
      await this.applicationRepository.save(app);
    }
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
    console.log(
      `Email Service: Starting sendApplicationReceivedEmail for ${recipientEmail}`,
    );

    try {
      console.log(`Email Service: Looking for template "Application Received"`);
      // Find the template
      const template = await this.emailTemplateRepository.findOne({
        where: { name: 'Application Received' },
      });

      if (!template) {
        console.error('Email template "Application Received" not found');
        throw new Error('Email template "Application Received" not found');
      }

      console.log(`Email Service: Template found, preparing email content`);
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

      console.log(`Email Service: Sending email with options:`, {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        // Don't log the full HTML body, just its length
        bodyLength: mailOptions.html.length,
      });

      console.log(`Email Service: Attempting to send email via transporter...`);
      const info = await this.sendMailjetEmail(mailOptions);
      console.log(`Email Service: Email sent successfully:`, {
        messageId: info.body?.Messages?.[0]?.To?.[0]?.MessageID,
        status: info.body?.Messages?.[0]?.Status,
      });

      console.log(`Email Service: Saving mail log to database`);
      // Log the email (automatic emails don't have a creator)
      await this.mailLogRepository.save({
        application_id: application.id,
        email_template_id: template.id,
        subject: subject,
        message: body,
        created_by: null, // Automatic emails don't have a creator
      });

      console.log(
        `Application Received email sent to ${recipientEmail} for application ${application.id}`,
      );
    } catch (error) {
      console.error(
        `Email Service: Failed to send application received email:`,
        {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode,
        },
      );
      console.error(`Email Service: Full error stack:`, error.stack);
      throw error; // Re-throw to be caught by the applications service
    }
  }

  /**
   * Send notification email to a single application
   */
  async sendSingleNotification(
    dto: SendSingleNotificationDto,
    userId: string,
  ): Promise<MailLog> {
    const { applicationId, templateId, markAsSent = true } = dto;

    // Get application with all necessary relations
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'job', 'job.location'],
    });

    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }

    // IMPORTANT: Check if applicant already received email for this job
    const emailStatus = await this.hasApplicantReceivedEmailForJob(
      application.applicantId,
      application.jobId,
    );

    if (emailStatus.hasReceived) {
      throw new Error(
        `${application.applicant.name} has already received a ${emailStatus.emailType} email for ${application.job.jobTitle} on ${new Date(emailStatus.sentAt).toLocaleDateString()}. Only one result email (accepted/rejected/interview) is allowed per applicant per job.`,
      );
    }

    // Prepare context for template rendering - adapt to match template variables
    const context = {
      candidate_name: application.applicant.name,
      position: application.job.jobTitle,
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

    // Add to queue for sending (mail log will be created by queue processor after successful send)
    await this.emailQueue.add('send-email', {
      to: application.applicant.email,
      subject,
      html: message,
      mailLogDto,
    });

    // Mark ALL applications for this applicant+job as emailSent
    if (markAsSent) {
      await this.markAllApplicantJobApplicationsAsEmailSent(
        application.applicantId,
        application.jobId,
      );
    }

    // Return a temporary mail log object (actual log will be created by queue processor)
    return {
      id: 'pending',
      application_id: applicationId,
      email_template_id: templateId,
      subject,
      message,
      created_by: userId,
      sent_at: new Date(),
    } as MailLog;
  }

  /**
   * Send notification emails to multiple applications
   */
  async sendBulkNotifications(
    dto: SendBulkNotificationDto,
    userId: string,
  ): Promise<{
    successful: number;
    failed: string[];
    skipped: string[];
  }> {
    const { applicationIds, templateId, markAsSent = true } = dto;

    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }

    const results = {
      successful: 0,
      failed: [] as string[],
      skipped: [] as string[], // Track skipped emails
    };

    // Track processed applicant+job combinations to avoid duplicates in the same batch
    const processedApplicantJobs = new Set<string>();

    // Process each application
    for (const applicationId of applicationIds) {
      try {
        // Get application with necessary relations
        const application = await this.applicationRepository.findOne({
          where: { id: applicationId },
          relations: ['applicant', 'job', 'job.location'],
        });

        if (!application) {
          results.failed.push(`Application with ID ${applicationId} not found`);
          continue;
        }

        const applicantJobKey = `${application.applicantId}-${application.jobId}`;

        // CASE 1: Skip if we already processed this applicant+job in this batch
        if (processedApplicantJobs.has(applicantJobKey)) {
          results.skipped.push(
            `${application.applicant.name} - ${application.job.jobTitle} (duplicate in this batch)`,
          );
          continue;
        }

        // CASE 2: Skip if applicant already received email for this job previously
        const emailStatus = await this.hasApplicantReceivedEmailForJob(
          application.applicantId,
          application.jobId,
        );

        if (emailStatus.hasReceived) {
          results.skipped.push(
            `${application.applicant.name} - ${application.job.jobTitle} (already received ${emailStatus.emailType} on ${new Date(emailStatus.sentAt).toLocaleDateString()})`,
          );
          continue;
        }

        // CASE 3: OK to send email
        // Prepare context for template rendering - adapt to match template variables
        const context = {
          candidate_name: application.applicant.name,
          position: application.job.jobTitle,
          interview_date: '{{interview_date}}', // Placeholder for future use
          interview_time: '{{interview_time}}', // Placeholder for future use
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

        // Add to queue for sending (mail log will be created by queue processor after successful send)
        await this.emailQueue.add('send-email', {
          to: application.applicant.email,
          subject,
          html: message,
          mailLogDto,
        });

        // Mark this applicant+job combination as processed
        processedApplicantJobs.add(applicantJobKey);

        // Mark ALL applications for this applicant+job as emailSent
        if (markAsSent) {
          await this.markAllApplicantJobApplicationsAsEmailSent(
            application.applicantId,
            application.jobId,
          );
        }

        // Don't create mail log here - queue processor will handle it after successful send
        results.successful++;
      } catch (error) {
        console.error(
          `Failed to send email for application ${applicationId}:`,
          error,
        );
        results.failed.push(`Application ${applicationId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Preview an email template with application context
   */
  async previewEmail(
    applicationId: string,
    templateId: string,
  ): Promise<{ subject: string; body: string }> {
    // Get application with all necessary relations
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'job', 'job.location'],
    });

    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    // Get the template
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }

    // Prepare context for template rendering - adapt to match template variables
    const context = {
      candidate_name: application.applicant.name,
      position: application.job.jobTitle,
      interview_date: '{{interview_date}}', // Placeholder for future use
      interview_time: '{{interview_time}}', // Placeholder for future use
    };

    // Render the template
    const subject = this.renderTemplate(template.subject_template, context);
    const body = this.renderTemplate(template.body_template, context);

    return { subject, body };
  }
}
