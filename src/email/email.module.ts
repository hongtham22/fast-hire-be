import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EmailTemplate } from './entities/email-template.entity';
import { MailLog } from './entities/mail-log.entity';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailQueueProcessor } from './email-queue.processor';
import { Application } from '@/applications/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailTemplate, MailLog, Application]),
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailQueueProcessor],
  exports: [EmailService],
})
export class EmailModule {}
