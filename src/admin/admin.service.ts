import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Job, JobStatus } from '../jobs/job.entity';
import { Application } from '../applications/application.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const [totalCandidates, totalJobs, pendingJobs, totalHR, avgMatchingScore] =
      await Promise.all([
        this.applicationRepository
          .createQueryBuilder('app')
          .select('COUNT(DISTINCT app.applicantId)', 'count')
          .getRawOne()
          .then((result) => parseInt(result?.count) || 0),
        this.jobRepository.count({
          where: { status: JobStatus.APPROVED },
        }),
        this.jobRepository.count({
          where: { status: JobStatus.PENDING },
        }),
        this.userRepository.count({
          where: { role: 'hr', isActive: true },
        }),
        this.applicationRepository
          .createQueryBuilder('app')
          .select('AVG(app.matchingScore)', 'avg')
          .getRawOne()
          .then((result) => Math.round(result?.avg || 0)),
      ]);

    return {
      totalCandidates,
      totalJobs,
      pendingJobs,
      totalHR,
      averageMatchingScore: avgMatchingScore,
    };
  }

  /**
   * Get recent applications for dashboard
   */
  async getRecentApplications() {
    const applications = await this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .orderBy('app.submittedAt', 'DESC')
      .limit(6)
      .getMany();

    return applications.map((app) => ({
      id: app.id,
      candidateName: app.applicant?.name || 'Unknown',
      jobTitle: app.job?.jobTitle || 'Unknown Position',
      matchingScore: app.matchingScore || 0,
      status:
        app.result === null ? 'pending' : app.result ? 'approved' : 'rejected',
      appliedAt: app.submittedAt,
    }));
  }

  /**
   * Get job matching scores for dashboard
   */
  async getJobMatchingScores() {
    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.applications', 'app')
      .where('job.status = :status', { status: JobStatus.APPROVED })
      .getMany();

    return jobs.map((job) => {
      const scores =
        job.applications?.map((app) => app.matchingScore || 0) || [];
      const avgScore = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const high = scores.filter((s) => s >= 80).length;
      const medium = scores.filter((s) => s >= 60 && s < 80).length;
      const low = scores.filter((s) => s < 60).length;

      return {
        jobId: job.id,
        jobTitle: job.jobTitle,
        averageScore: avgScore,
        applicationsCount: scores.length,
        highScoreCount: high,
        mediumScoreCount: medium,
        lowScoreCount: low,
      };
    });
  }

  /**
   * Get applications chart data (last 30 days)
   */
  async getApplicationsChartData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const applications = await this.applicationRepository
      .createQueryBuilder('app')
      .where('app.submittedAt >= :date', { date: thirtyDaysAgo })
      .orderBy('app.submittedAt', 'ASC')
      .getMany();

    const dailyData = {};
    applications.forEach((app) => {
      const day = app.submittedAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dailyData[day]) {
        dailyData[day] = 0;
      }
      dailyData[day]++;
    });

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      days.push({
        day: dayName,
        applications: dailyData[day] || 0,
      });
    }

    return {
      labels: days.map((d) => d.day),
      data: days.map((d) => d.applications),
    };
  }
}
