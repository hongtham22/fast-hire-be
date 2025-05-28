import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { MulterModule } from '@nestjs/platform-express';
import { ApplicantsModule } from '../applicants/applicants.module';
import { CVKeywordsModule } from '../cv_keywords/cv-keywords.module';
import { CvProcessingModule } from '../cv-processing/cv-processing.module';
import { JobsModule } from '../jobs/jobs.module';
import { EmailModule } from '../email/email.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    ApplicantsModule,
    forwardRef(() => CVKeywordsModule),
    CvProcessingModule,
    MulterModule.register({}),
    JobsModule,
    EmailModule,
    UploadsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
