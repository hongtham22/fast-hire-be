import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Applicant } from './applicant.entity';
import { ApplicantsService } from './applicants.service';
import { Application } from '../applications/application.entity';
import { ApplicantsController } from './applicants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Applicant, Application])],
  providers: [ApplicantsService],
  controllers: [ApplicantsController],
  exports: [ApplicantsService], // Export the service to be used in other modules
})
export class ApplicantsModule {}
