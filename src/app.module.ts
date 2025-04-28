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
import { Category } from './cv_keywords/category.entity';
import { CVKeywordCategory } from './cv_keywords/cv-keyword-category.entity';
import { JDCategory } from './jd_keywords/jd-category.entity';
import { JDKeywordCategory } from './jd_keywords/jd-keyword-category.entity';
import { ApplicationsModule } from './applications/applications.module';
import { ApplicantsModule } from './applicants/applicants.module';

@Module({
  imports: [
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
        Category,
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
