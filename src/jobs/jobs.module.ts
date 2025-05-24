import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JDKeyword } from '../jd_keywords/jd-keyword.entity';
import { JDCategory } from '../jd_keywords/jd-category.entity';
import { JDKeywordCategory } from '../jd_keywords/jd-keyword-category.entity';
import { Application } from '../applications/application.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      JDKeyword,
      JDCategory,
      JDKeywordCategory,
      Application,
    ]),
    EmailModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
