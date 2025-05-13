import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class CvProcessingService {
  constructor(@InjectQueue('cv-processing') private cvProcessingQueue: Queue) {}

  async addCvProcessingJob(
    applicationId: string,
    cvFilePath: string,
    jobId: string,
  ) {
    return this.cvProcessingQueue.add(
      'process-cv',
      {
        applicationId,
        cvFilePath,
        jobId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
