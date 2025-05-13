import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CVKeywordsService } from '../cv_keywords/cv-keywords.service';

@Processor('cv-processing')
export class CvProcessingProcessor {
  private readonly logger = new Logger(CvProcessingProcessor.name);

  constructor(private readonly cvKeywordsService: CVKeywordsService) {}

  @Process('process-cv')
  async handleCvProcessing(job: Job) {
    const { applicationId, cvFilePath, jobId } = job.data;

    try {
      this.logger.log(
        `Processing CV for application ${applicationId} and job ${jobId}`,
      );

      // Process CV to extract keywords and perform JD matching
      await this.cvKeywordsService.processCV(applicationId, cvFilePath, jobId);

      this.logger.log(
        `Successfully processed CV for application ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process CV for application ${applicationId}: ${error.message}`,
      );
      throw error;
    }
  }
}
