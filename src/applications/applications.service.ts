import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicantsService } from '../applicants/applicants.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { CVKeywordsService } from '../cv_keywords/cv-keywords.service';
import { CvProcessingService } from '../cv-processing/cv-processing.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly applicantsService: ApplicantsService,
    private readonly cvKeywordsService: CVKeywordsService,
    private readonly cvProcessingService: CvProcessingService,
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

    // 4. Add CV processing to queue
    try {
      console.log(
        `Application submission: Adding CV processing to queue for application ${savedApplication.id}`,
      );
      await this.cvProcessingService.addCvProcessingJob(
        savedApplication.id,
        cvFilePath,
        jobId,
      );
      console.log(
        `Application submission: CV processing job added to queue for application ${savedApplication.id}`,
      );
    } catch (error) {
      console.error(
        `Application submission: Failed to add CV processing to queue: ${error.message}`,
      );
      // Don't fail the application submission if queue addition fails
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
      order: {
        submittedAt: 'DESC',
      },
    });
  }

  async findByApplicantId(applicantId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { applicantId },
      relations: ['job', 'cvKeyword'],
    });
  }

  async findOneByJobAndApplication(
    jobId: string,
    applicationId: string,
  ): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: {
        id: applicationId,
        jobId: jobId,
      },
      relations: ['applicant', 'job', 'cvKeyword'],
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

    // Also delete all cv_categories
    await this.cvKeywordsService.deleteAllCategories();

    // Optionally delete all applicants
    if (deleteApplicants) {
      await this.applicantsService.deleteAll();
    }
  }

  async evaluateApplication(
    applicationId: string,
    note: string,
    result: boolean,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    application.note = note;
    application.result = result;

    return this.applicationRepository.save(application);
  }
}
