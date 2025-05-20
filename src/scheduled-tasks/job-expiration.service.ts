import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class JobExpirationService {
  private readonly logger = new Logger(JobExpirationService.name);

  constructor(private readonly jobsService: JobsService) {}

  /**
   * Runs daily at midnight to check for expired jobs and close them
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleJobExpiration() {
    this.logger.log('Running job expiration check...');
    try {
      // Get all approved jobs that have passed their expiration date
      const expiredJobs = await this.jobsService.findExpiredJobs();

      this.logger.log(`Found ${expiredJobs.length} expired jobs to close`);

      // Close each expired job
      for (const job of expiredJobs) {
        await this.jobsService.closeJob(job.id, 'expired');
        this.logger.log(`Closed expired job: ${job.id} - ${job.jobTitle}`);
      }

      this.logger.log('Job expiration check completed successfully');
    } catch (error) {
      this.logger.error(`Error in job expiration check: ${error.message}`);
    }
  }
}
