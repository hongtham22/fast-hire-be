import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CVKeywordsService } from './cv-keywords.service';
import { CVKeywordsController } from './cv-keywords.controller';
import { CVKeyword } from './cv-keyword.entity';
import { CVKeywordCategory } from './cv-keyword-category.entity';
import { CVCategory } from './cv-category.entity';
import { ConfigModule } from '@nestjs/config';
import { Application } from '@/applications/application.entity';
import { JdKeywordsModule } from '@/jd_keywords/jd-keywords.module';
import { ApplicationsModule } from '@/applications/applications.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { Job } from '../jobs/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CVKeyword,
      CVKeywordCategory,
      CVCategory,
      Application,
      Job,
    ]),
    ConfigModule,
    JdKeywordsModule,
    UploadsModule,
    forwardRef(() => ApplicationsModule),
  ],
  providers: [CVKeywordsService],
  exports: [CVKeywordsService],
  controllers: [CVKeywordsController],
})
export class CVKeywordsModule {}
