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

    // 4. Process CV to extract keywords and perform JD matching
    try {
      console.log(
        `Application submission: Processing CV to extract keywords and perform JD matching for application ${savedApplication.id}`,
      );
      // Pass the jobId to enable JD matching
      await this.cvKeywordsService.processCV(
        savedApplication.id,
        cvFilePath,
        jobId, // Pass jobId to enable JD matching
      );
      console.log(
        `Application submission: CV keywords extraction and matching completed for application ${savedApplication.id}`,
      );
    } catch (error) {
      console.error(
        `Application submission: Failed to extract CV keywords or perform matching: ${error.message}`,
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

  /**
   * Delete all applications and related data
   *
   * This method uses application entity's cascade delete settings to
   * automatically delete related records (keywords and category relations)
   *
   * @param deleteApplicants If true, all applicants will also be deleted
   */
  async deleteAll(deleteApplicants = false): Promise<void> {
    // Delete all applications
    // Due to cascade relationships set in the entities, this will also:
    // - Delete all cv_keywords related to applications
    // - Delete all cv_keyword_category records related to the cv_keywords
    await this.applicationRepository.delete({});

    // Optionally delete all applicants
    if (deleteApplicants) {
      await this.applicantsService.deleteAll();
    }
  }
}
