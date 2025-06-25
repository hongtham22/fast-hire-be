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

    // 3. Check if applicant already received result email for this job
    console.log(
      `Application submission: Checking if applicant ${applicant.id} already received email for job ${jobId}`,
    );
    let emailSent = false;
    try {
      const emailStatus =
        await this.emailService.hasApplicantReceivedEmailForJob(
          applicant.id,
          jobId,
        );
      if (emailStatus.hasReceived) {
        emailSent = true;
        console.log(
          `Application submission: Applicant already received ${emailStatus.emailType} email on ${emailStatus.sentAt}, setting emailSent=true`,
        );
      } else {
        console.log(
          `Application submission: No previous result email found for applicant, setting emailSent=false`,
        );
      }
    } catch (error) {
      console.error(
        `Application submission: Failed to check existing emails: ${error.message}`,
      );
      // Continue with emailSent=false if check fails
    }

    // 4. Create the application with correct emailSent status
    const newApplication = this.applicationRepository.create({
      applicantId: applicant.id,
      jobId,
      cvFileUrl: cvFileUrl,
      emailSent: emailSent, // Set based on existing email status
    });

    const savedApplication =
      await this.applicationRepository.save(newApplication);

    // Get job details for email
    const job = await this.jobsService.findOne(jobId);

    // 5. Send application received email
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

    // 6. Add CV processing to queue
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
            const programmingLanguages =
              structuredData['programming_language']?.slice(0, 6) || [];

            const technicalSkills =
              structuredData['technical_skill']?.slice(0, 9) || [];

            const languages = structuredData['language']?.slice(0, 3) || [];

            const education = structuredData['education'] || [];

            const experiences = structuredData['experience'] || [];

            let totalExperienceYears = 0;

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

  async deleteAll(deleteApplicants = false): Promise<void> {
    await this.emailService.deleteMailLogs();

    await this.applicationRepository.delete({});

    await this.cvKeywordsService.deleteAllCategories();

    if (deleteApplicants) {
      await this.applicantsService.deleteAll();
    }
  }

  async deleteApplication(id: string): Promise<void> {
    await this.emailService.deleteMailLogs(id);

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

  async getCandidatesForHR(hrUserId: string): Promise<any[]> {
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.cvKeyword', 'cvKeyword')
      .leftJoinAndSelect('cvKeyword.categories', 'categories')
      .leftJoinAndSelect('categories.category', 'category')
      .where('job.created_by = :hrUserId', { hrUserId })
      .orderBy('application.submittedAt', 'DESC')
      .getMany();

    // Group applications by applicant
    const candidatesMap = new Map();

    applications.forEach((app) => {
      const applicantId = app.applicant.id;

      if (!candidatesMap.has(applicantId)) {
        // Process structured data from CV keywords
        let skills = [];
        let technical_skills = [];
        let languages = [];
        let education = [];
        let experience_years = null;
        let latest_company = null;

        if (app.cvKeyword) {
          try {
            const structuredData: Record<string, any> = {};

            if (
              app.cvKeyword.categories &&
              app.cvKeyword.categories.length > 0
            ) {
              for (const categoryItem of app.cvKeyword.categories) {
                if (categoryItem.category && categoryItem.category.name) {
                  structuredData[categoryItem.category.name] =
                    categoryItem.value || null;
                }
              }
            }

            if (Object.keys(structuredData).length > 0) {
              skills =
                structuredData['programming_language']?.slice(0, 6) || [];
              technical_skills =
                structuredData['technical_skill']?.slice(0, 9) || [];
              languages = structuredData['language']?.slice(0, 3) || [];
              education = structuredData['education'] || [];

              // Get experience years directly from candidate data
              if (
                structuredData['candidate'] &&
                structuredData['candidate'].experience_years !== undefined
              ) {
                experience_years = Number(
                  structuredData['candidate'].experience_years,
                );
              }

              // Get latest company from experience data
              if (
                structuredData['experience'] &&
                structuredData['experience'].length > 0
              ) {
                const experiences = structuredData['experience'];
                if (experiences.length > 0) {
                  latest_company = experiences[0].company || null;
                }
              }
            }
          } catch (error) {
            console.error('Error processing CV keyword data:', error);
          }
        }

        candidatesMap.set(applicantId, {
          id: app.applicant.id,
          name: app.applicant.name,
          email: app.applicant.email,
          phone: app.applicant.phone,
          skills,
          technical_skills,
          languages,
          education,
          experience_years,
          latest_company,
          totalApplications: 1,
          latestApplication: {
            id: app.id,
            jobTitle: app.job.jobTitle,
            submittedAt: app.submittedAt,
            matchingScore: app.matchingScore,
            result: app.result,
            status:
              app.result === true
                ? 'accepted'
                : app.result === false
                  ? 'rejected'
                  : 'pending',
          },
          applications: [
            {
              id: app.id,
              jobId: app.job.id,
              jobTitle: app.job.jobTitle,
              submittedAt: app.submittedAt,
              matchingScore: app.matchingScore,
              result: app.result,
              status:
                app.result === true
                  ? 'accepted'
                  : app.result === false
                    ? 'rejected'
                    : 'pending',
            },
          ],
        });
      } else {
        const candidate = candidatesMap.get(applicantId);
        candidate.totalApplications++;

        const applicationData = {
          id: app.id,
          jobId: app.job.id,
          jobTitle: app.job.jobTitle,
          submittedAt: app.submittedAt,
          matchingScore: app.matchingScore,
          result: app.result,
          status:
            app.result === true
              ? 'accepted'
              : app.result === false
                ? 'rejected'
                : 'pending',
        };

        candidate.applications.push(applicationData);

        // Update latest application if this is more recent
        if (
          new Date(app.submittedAt) >
          new Date(candidate.latestApplication.submittedAt)
        ) {
          candidate.latestApplication = applicationData;
        }
      }
    });

    return Array.from(candidatesMap.values());
  }

  async getAllCandidatesForAdmin(hrUserId?: string): Promise<any[]> {
    let queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.cvKeyword', 'cvKeyword')
      .leftJoinAndSelect('cvKeyword.categories', 'categories')
      .leftJoinAndSelect('categories.category', 'category');

    if (hrUserId) {
      queryBuilder = queryBuilder.where('job.created_by = :hrUserId', {
        hrUserId,
      });
    }

    const applications = await queryBuilder
      .orderBy('application.submittedAt', 'DESC')
      .getMany();

    const candidatesMap = new Map();

    applications.forEach((app) => {
      const applicantId = app.applicant.id;

      if (!candidatesMap.has(applicantId)) {
        let skills = [];
        let technical_skills = [];
        let languages = [];
        let education = [];
        let experience_years = null;
        let latest_company = null;

        if (app.cvKeyword) {
          try {
            const structuredData: Record<string, any> = {};

            if (
              app.cvKeyword.categories &&
              app.cvKeyword.categories.length > 0
            ) {
              for (const categoryItem of app.cvKeyword.categories) {
                if (categoryItem.category && categoryItem.category.name) {
                  structuredData[categoryItem.category.name] =
                    categoryItem.value || null;
                }
              }
            }

            if (Object.keys(structuredData).length > 0) {
              skills =
                structuredData['programming_language']?.slice(0, 6) || [];
              technical_skills =
                structuredData['technical_skill']?.slice(0, 9) || [];
              languages = structuredData['language']?.slice(0, 3) || [];
              education = structuredData['education'] || [];

              // Get experience years directly from candidate data
              if (
                structuredData['candidate'] &&
                structuredData['candidate'].experience_years !== undefined
              ) {
                experience_years = Number(
                  structuredData['candidate'].experience_years,
                );
              }

              // Get latest company from experience data
              if (
                structuredData['experience'] &&
                structuredData['experience'].length > 0
              ) {
                const experiences = structuredData['experience'];
                if (experiences.length > 0) {
                  latest_company = experiences[0].company || null;
                }
              }
            }
          } catch (error) {
            console.error('Error processing CV keyword data:', error);
          }
        }

        candidatesMap.set(applicantId, {
          id: app.applicant.id,
          name: app.applicant.name,
          email: app.applicant.email,
          phone: app.applicant.phone,
          skills,
          technical_skills,
          languages,
          education,
          experience_years,
          latest_company,
          totalApplications: 1,
          latestApplication: {
            id: app.id,
            jobTitle: app.job.jobTitle,
            submittedAt: app.submittedAt,
            matchingScore: app.matchingScore,
            result: app.result,
            status:
              app.result === true
                ? 'accepted'
                : app.result === false
                  ? 'rejected'
                  : 'pending',
          },
          applications: [
            {
              id: app.id,
              jobId: app.job.id,
              jobTitle: app.job.jobTitle,
              submittedAt: app.submittedAt,
              matchingScore: app.matchingScore,
              result: app.result,
              status:
                app.result === true
                  ? 'accepted'
                  : app.result === false
                    ? 'rejected'
                    : 'pending',
            },
          ],
        });
      } else {
        // Add this application to existing candidate
        const candidate = candidatesMap.get(applicantId);
        candidate.totalApplications++;

        const applicationData = {
          id: app.id,
          jobId: app.job.id,
          jobTitle: app.job.jobTitle,
          submittedAt: app.submittedAt,
          matchingScore: app.matchingScore,
          result: app.result,
          status:
            app.result === true
              ? 'accepted'
              : app.result === false
                ? 'rejected'
                : 'pending',
        };

        candidate.applications.push(applicationData);

        // Update latest application if this is more recent
        if (
          new Date(app.submittedAt) >
          new Date(candidate.latestApplication.submittedAt)
        ) {
          candidate.latestApplication = applicationData;
        }
      }
    });

    return Array.from(candidatesMap.values());
  }

  async syncEmailSentFlags(): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    console.log('Starting emailSent flag synchronization...');

    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
    };

    try {
      const applications = await this.applicationRepository.find({
        relations: ['applicant', 'job'],
        order: { submittedAt: 'ASC' },
      });

      const applicantJobGroups = new Map<string, typeof applications>();

      for (const app of applications) {
        const key = `${app.applicantId}-${app.jobId}`;
        if (!applicantJobGroups.has(key)) {
          applicantJobGroups.set(key, []);
        }
        applicantJobGroups.get(key)!.push(app);
      }

      console.log(
        `Found ${applicantJobGroups.size} unique applicant+job combinations`,
      );

      // Process each group
      for (const [key, groupApps] of applicantJobGroups.entries()) {
        const [applicantId, jobId] = key.split('-');
        results.processed++;

        try {
          // Check if this applicant+job has any result emails
          const emailStatus =
            await this.emailService.hasApplicantReceivedEmailForJob(
              applicantId,
              jobId,
            );

          const shouldHaveEmailSent = emailStatus.hasReceived;

          // Update all applications in this group if needed
          let groupUpdated = false;
          for (const app of groupApps) {
            if (app.emailSent !== shouldHaveEmailSent) {
              await this.applicationRepository.update(app.id, {
                emailSent: shouldHaveEmailSent,
              });
              groupUpdated = true;
              console.log(
                `Updated application ${app.id}: emailSent ${app.emailSent} → ${shouldHaveEmailSent} (${emailStatus.emailType || 'no email'})`,
              );
            }
          }

          if (groupUpdated) {
            results.updated++;
          }
        } catch (error) {
          const errorMsg = `Failed to process group ${key}: ${error.message}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      console.log(
        `EmailSent sync completed: ${results.updated}/${results.processed} groups updated`,
      );
      return results;
    } catch (error) {
      const errorMsg = `EmailSent sync failed: ${error.message}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      throw error;
    }
  }
}
