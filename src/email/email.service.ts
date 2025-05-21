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

@Injectable()
export class EmailService {
  private transporter: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(MailLog)
    private readonly mailLogRepository: Repository<MailLog>,
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
      const trimmedKey = key.trim();
      return context[trimmedKey] !== undefined
        ? context[trimmedKey]
        : `{{${trimmedKey}}}`;
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
}
