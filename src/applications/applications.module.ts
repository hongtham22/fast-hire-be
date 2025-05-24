import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApplicantsModule } from '../applicants/applicants.module';
import { CVKeywordsModule } from '../cv_keywords/cv-keywords.module';
import { CvProcessingModule } from '../cv-processing/cv-processing.module';
import { JobsModule } from '../jobs/jobs.module';
import { EmailModule } from '../email/email.module';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    ApplicantsModule,
    forwardRef(() => CVKeywordsModule),
    CvProcessingModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
    JobsModule,
    EmailModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
