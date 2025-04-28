import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Applicant } from './applicant.entity';
import { ApplicantsService } from './applicants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Applicant])],
  providers: [ApplicantsService],
  exports: [ApplicantsService], // Export the service to be used in other modules
})
export class ApplicantsModule {}
