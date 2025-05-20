import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsModule } from '../jobs/jobs.module';
import { JobExpirationService } from '@/scheduled-tasks/job-expiration.service';

@Module({
  imports: [ScheduleModule.forRoot(), JobsModule],
  providers: [JobExpirationService],
})
export class ScheduledTasksModule {}
