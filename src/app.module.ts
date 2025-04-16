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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      entities: [User, EmailTemplate, MailLog, Location, Job],
      // synchronize: true,
    }),
    UsersModule,
    EmailModule,
    LocationsModule,
  ],
  controllers: [AppController, UploadsController],
  providers: [AppService],
})
export class AppModule {}
