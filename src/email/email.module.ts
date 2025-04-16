import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { MailLog } from './entities/mail-log.entity';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate, MailLog])],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
