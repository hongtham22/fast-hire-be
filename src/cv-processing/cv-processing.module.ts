import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CvProcessingService } from './cv-processing.service';
import { CVKeywordsModule } from '../cv_keywords/cv-keywords.module';
import { CvProcessingProcessor } from './cv-processing.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'cv-processing',
      limiter: {
        max: 5, // Maximum number of jobs processed
        duration: 1000, // Per 1 second
      },
    }),
    CVKeywordsModule,
  ],
  providers: [CvProcessingService, CvProcessingProcessor],
  exports: [CvProcessingService],
})
export class CvProcessingModule {}
