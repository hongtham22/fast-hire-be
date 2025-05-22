import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailLog } from './entities/mail-log.entity';

@Processor('email-queue')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);
  private transporter: any;

  constructor(
    private configService: ConfigService,
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

  @Process('send-email')
  async handleSendEmail(job: Job<any>) {
    try {
      this.logger.log(`Processing email job ${job.id}`);
      const { to, subject, html, mailLogDto } = job.data;

      // Send the email
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@fasthire.com',
        to,
        subject,
        html,
      });

      // Log success
      this.logger.log(`Email sent successfully to ${to}`);

      // Update mail log status if needed
      if (mailLogDto && mailLogDto.id) {
        const mailLog = await this.mailLogRepository.findOne({
          where: { id: mailLogDto.id }
        });
        if (mailLog) {
          mailLog.status = 'sent';
          await this.mailLogRepository.save(mailLog);
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
} 