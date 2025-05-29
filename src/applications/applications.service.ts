import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicantsService } from '../applicants/applicants.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { CVKeywordsService } from '../cv_keywords/cv-keywords.service';
import { CvProcessingService } from '../cv-processing/cv-processing.service';
import { EmailService } from '../email/email.service';
import { JobsService } from '../jobs/jobs.service';
import { SpacesService } from '../uploads/spaces.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly applicantsService: ApplicantsService,
    private readonly cvKeywordsService: CVKeywordsService,
    private readonly cvProcessingService: CvProcessingService,
    private readonly emailService: EmailService,
    private readonly jobsService: JobsService,
    private readonly spacesService: SpacesService,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
    cvFileUrl: string,
  ): Promise<Application> {
    const newApplication = this.applicationRepository.create({
      ...createApplicationDto,
      cvFileUrl: cvFileUrl,
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

    // 2. Upload CV file to Spaces
    console.log(`Application submission: Uploading CV file to Spaces`);
    const uploadResult = await this.spacesService.uploadFile(cvFile, 'cvs');
    const cvFileUrl = uploadResult.url;
    const cvFileKey = uploadResult.key;
    console.log(`Application submission: CV file uploaded to ${cvFileUrl}`);

    // 3. Create the application
    const newApplication = this.applicationRepository.create({
      applicantId: applicant.id,
      jobId,
      cvFileUrl: cvFileUrl,
    });

    const savedApplication =
      await this.applicationRepository.save(newApplication);

    // Get job details for email
    const job = await this.jobsService.findOne(jobId);

    // 4. Send application received email
    try {
      console.log(
        `Application submission: Sending application received email to ${email}`,
      );
      await this.emailService.sendApplicationReceivedEmail(
        savedApplication,
        email,
        applicant.name,
        job.jobTitle,
      );
      console.log(
        `Application submission: Application received email sent successfully to ${email}`,
      );
    } catch (error) {
      console.error(
        `Application submission: Failed to send application received email: ${error.message}`,
        error.stack ? `\nStack trace: ${error.stack}` : '',
      );
      // Don't fail the application submission if email sending fails
    }

    // 5. Add CV processing to queue
    try {
      console.log(
        `Application submission: Adding CV processing to queue for application ${savedApplication.id}`,
      );
      await this.cvProcessingService.addCvProcessingJob(
        savedApplication.id,
        cvFileKey,
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
    const applications = await this.applicationRepository.find({
      where: { jobId },
      relations: [
        'applicant',
        'job',
        'cvKeyword',
        'cvKeyword.categories',
        'cvKeyword.categories.category',
      ],
      order: {
        submittedAt: 'DESC',
      },
    });

    // Extract structured data from cvKeyword for each application
    return applications.map((app) => {
      if (app.cvKeyword) {
        try {
          // Create structured_data object from categories
          const structuredData: Record<string, any> = {};

          // Process categories and build structured data
          if (app.cvKeyword.categories && app.cvKeyword.categories.length > 0) {
            for (const categoryItem of app.cvKeyword.categories) {
              if (categoryItem.category && categoryItem.category.name) {
                structuredData[categoryItem.category.name] =
                  categoryItem.value || null;
              }
            }
          }

          if (Object.keys(structuredData).length > 0) {
            // Extract programming languages (limit to 6)
            const programmingLanguages =
              structuredData['programming_language']?.slice(0, 6) || [];

            // Extract technical skills (limit to 9)
            const technicalSkills =
              structuredData['technical_skill']?.slice(0, 9) || [];

            // Extract languages (limit to 3)
            const languages = structuredData['language']?.slice(0, 3) || [];

            // Extract education information
            const education = structuredData['education'] || [];

            // Extract experience information
            const experiences = structuredData['experience'] || [];

            // Calculate total experience years (if available)
            let totalExperienceYears = 0;

            // First check if experience_years is directly available in the candidate info
            if (
              structuredData['candidate'] &&
              structuredData['candidate'].experience_years !== undefined
            ) {
              totalExperienceYears = Number(
                structuredData['candidate'].experience_years,
              );
            }
            // Otherwise calculate from detailed experience entries
            else if (experiences && experiences.length > 0) {
              totalExperienceYears = experiences.reduce((total, exp) => {
                if (exp.start_date && (exp.end_date || exp.is_current)) {
                  const startDate = new Date(exp.start_date);
                  const endDate = exp.is_current
                    ? new Date()
                    : new Date(exp.end_date);
                  const years =
                    (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24 * 365);
                  return total + years;
                }
                return total;
              }, 0);
              // Round to 1 decimal place
              totalExperienceYears = Math.round(totalExperienceYears * 10) / 10;
            }

            return {
              ...app,
              skills: programmingLanguages,
              technical_skills: technicalSkills,
              languages: languages,
              education: education,
              experience_years: totalExperienceYears,
              hasStructuredData: true,
              hasNote: app.note !== null && app.note !== '',
            };
          }
        } catch (error) {
          console.error('Error processing CV keyword data:', error);
        }
      }

      // Return original application if no structured data available
      return {
        ...app,
        skills: [],
        technical_skills: [],
        languages: [],
        education: [],
        experience_years: null,
        hasStructuredData: false,
        hasNote: app.note !== null && app.note !== '',
      };
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
    // First, delete all mail logs that reference applications
    await this.emailService.deleteMailLogs();

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

  /**
   * Delete a specific application by ID
   * @param id Application ID to delete
   */
  async deleteApplication(id: string): Promise<void> {
    // First delete any mail logs for this application
    await this.emailService.deleteMailLogs(id);

    // Then delete the application
    await this.applicationRepository.delete(id);
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
