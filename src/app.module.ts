import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { UploadsController } from './uploads/uploads.controller';
import { EmailModule } from './email/email.module';
import { EmailTemplate } from './email/entities/email-template.entity';
import { MailLog } from './email/entities/mail-log.entity';
import { LocationsModule } from './locations/locations.module';
import { Location } from './locations/location.entity';
import { Job } from './jobs/job.entity';
import { JobsModule } from './jobs/jobs.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Application } from './applications/application.entity';
import { Applicant } from './applicants/applicant.entity';
import { JDKeyword } from './jd_keywords/jd-keyword.entity';
import { CVKeyword } from './cv_keywords/cv-keyword.entity';
import { CVCategory } from './cv_keywords/cv-category.entity';
import { CVKeywordCategory } from './cv_keywords/cv-keyword-category.entity';
import { JDCategory } from './jd_keywords/jd-category.entity';
import { JDKeywordCategory } from './jd_keywords/jd-keyword-category.entity';
import { ApplicationsModule } from './applications/applications.module';
import { ApplicantsModule } from './applicants/applicants.module';
import { CVKeywordsModule } from './cv_keywords/cv-keywords.module';
import { JdKeywordsModule } from './jd_keywords/jd-keywords.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CvProcessingModule } from './cv-processing/cv-processing.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      entities: [
        User,
        EmailTemplate,
        MailLog,
        Location,
        Job,
        Application,
        Applicant,
        JDKeyword,
        CVKeyword,
        CVCategory,
        CVKeywordCategory,
        JDCategory,
        JDKeywordCategory,
      ],
      // synchronize: true,
    }),
    UsersModule,
    EmailModule,
    LocationsModule,
    JobsModule,
    ApplicationsModule,
    ApplicantsModule,
    CVKeywordsModule,
    JdKeywordsModule,
    CvProcessingModule,
    ScheduledTasksModule,
    AuthModule,
  ],
  controllers: [AppController, UploadsController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
