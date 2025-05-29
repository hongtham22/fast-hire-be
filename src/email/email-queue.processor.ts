import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailLog } from './entities/mail-log.entity';
import Mailjet from 'node-mailjet';

@Processor('email-queue')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);
  private mailjet: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MailLog)
    private readonly mailLogRepository: Repository<MailLog>,
  ) {
    // Initialize Mailjet
    const mailjetApiKey = this.configService.get('MAILJET_API_KEY');
    const mailjetSecretKey = this.configService.get('MAILJET_SECRET_KEY');

    if (mailjetApiKey && mailjetSecretKey) {
      this.mailjet = Mailjet.apiConnect(mailjetApiKey, mailjetSecretKey);
      this.logger.log('Mailjet client initialized for email queue');
    } else {
      this.logger.error(
        'Mailjet credentials not found for email queue processor',
      );
    }
  }

  @Process('send-email')
  async handleSendEmail(job: Job<any>) {
    try {
      this.logger.log(`Processing email job ${job.id}`);
      const { to, subject, html } = job.data;

      if (!this.mailjet) {
        throw new Error('Mailjet client not initialized');
      }

      // Send the email using Mailjet
      const request = this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.configService.get('EMAIL_FROM'),
              Name: 'FastHire System',
            },
            To: [
              {
                Email: to,
              },
            ],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });

      const result = await request;
      this.logger.log(`Email sent successfully to ${to}`, {
        messageId: result.body?.Messages?.[0]?.To?.[0]?.MessageID,
        status: result.body?.Messages?.[0]?.Status,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
