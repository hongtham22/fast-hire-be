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
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    ApplicantsModule,
    forwardRef(() => CVKeywordsModule),
    CvProcessingModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'cvs');
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const fileExt = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${fileExt}`);
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
