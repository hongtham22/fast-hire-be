import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicantsService } from '../applicants/applicants.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { CVKeywordsService } from '../cv_keywords/cv-keywords.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private applicantsService: ApplicantsService,
    private cvKeywordsService: CVKeywordsService,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
    cvFilePath: string,
  ): Promise<Application> {
    const newApplication = this.applicationRepository.create({
      ...createApplicationDto,
      cvFileUrl: cvFilePath,
    });

    return this.applicationRepository.save(newApplication);
  }

  /**
   * Submit a new application for a job with applicant information
   * This will find or create an applicant, then create an application
   */
  async submitApplication(
    submitApplicationDto: SubmitApplicationDto,
    cvFile: Express.Multer.File,
  ): Promise<Application> {
    const { name, email, phone, jobId } = submitApplicationDto;

    // 1. Find or create the applicant
    console.log(
      `Application submission: Checking if applicant with email ${email} exists`,
    );
    const applicant = await this.applicantsService.findOrCreate({
      name,
      email,
      phone,
    });
    console.log(
      `Application submission: Using applicant id ${applicant.id}, name: ${applicant.name}, phone: ${applicant.phone}`,
    );

    // 2. Get the CV file path
    const cvFilePath = cvFile.path;
    console.log(`Application submission: CV file saved at ${cvFilePath}`);

    // 3. Create the application
    const newApplication = this.applicationRepository.create({
      applicantId: applicant.id,
      jobId,
      cvFileUrl: cvFilePath,
    });

    const savedApplication =
      await this.applicationRepository.save(newApplication);

    // 4. Process CV to extract keywords
    try {
      console.log(
        `Application submission: Processing CV to extract keywords for application ${savedApplication.id}`,
      );
      await this.cvKeywordsService.processCV(savedApplication.id, cvFilePath);
      console.log(
        `Application submission: CV keywords extraction completed for application ${savedApplication.id}`,
      );
    } catch (error) {
      console.error(
        `Application submission: Failed to extract CV keywords: ${error.message}`,
      );
      // Don't fail the application submission if keyword extraction fails
    }

    return savedApplication;
  }

  async findAll(): Promise<Application[]> {
    return this.applicationRepository.find({
      relations: ['applicant', 'job', 'cvKeyword'],
    });
  }

  async findOne(id: string): Promise<Application> {
    return this.applicationRepository.findOne({
      where: { id },
      relations: [
        'applicant',
        'job',
        'cvKeyword',
        'cvKeyword.categories',
        'cvKeyword.categories.category',
      ],
    });
  }

  async findByJobId(jobId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { jobId },
      relations: ['applicant', 'cvKeyword'],
    });
  }

  async findByApplicantId(applicantId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { applicantId },
      relations: ['job', 'cvKeyword'],
    });
  }
}
