import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './applicant.entity';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { Application } from '../applications/application.entity';

@Injectable()
export class ApplicantsService {
  constructor(
    @InjectRepository(Applicant)
    private applicantRepository: Repository<Applicant>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async findByEmail(email: string): Promise<Applicant | null> {
    return this.applicantRepository.findOne({ where: { email } });
  }

  async create(createApplicantDto: CreateApplicantDto): Promise<Applicant> {
    const newApplicant = this.applicantRepository.create(createApplicantDto);
    return this.applicantRepository.save(newApplicant);
  }

  async findOrCreate(
    createApplicantDto: CreateApplicantDto,
  ): Promise<Applicant> {
    const { email, name, phone } = createApplicantDto;

    const existingApplicant = await this.findByEmail(email);

    // If applicant exists, update their name and phone with the latest data
    if (existingApplicant) {
      // Update only if there are changes to avoid unnecessary database operations
      if (
        existingApplicant.name !== name ||
        existingApplicant.phone !== phone
      ) {
        console.log(`Updating existing applicant ${existingApplicant.id}:`);
        console.log(`- Name: ${existingApplicant.name} -> ${name}`);
        console.log(`- Phone: ${existingApplicant.phone} -> ${phone}`);

        existingApplicant.name = name;
        existingApplicant.phone = phone;
        return this.applicantRepository.save(existingApplicant);
      }
      console.log(
        `Using existing applicant without changes: ${existingApplicant.id}`,
      );
      return existingApplicant;
    }

    // Otherwise create a new applicant
    console.log(`Creating new applicant with email: ${email}`);
    return this.create(createApplicantDto);
  }

  async findOne(id: string): Promise<Applicant> {
    return this.applicantRepository.findOne({
      where: { id },
      relations: ['applications'],
    });
  }

  async findAll(): Promise<Applicant[]> {
    return this.applicantRepository.find({
      relations: ['applications'],
    });
  }

  async update(id: string, updateData: Partial<Applicant>): Promise<Applicant> {
    await this.applicantRepository.update(id, updateData);
    return this.findOne(id);
  }

  async deleteAll(): Promise<void> {
    await this.applicantRepository.delete({});
  }

  async getStatistics(hrUserId?: string) {
    if (hrUserId) {
      const totalApplicantsQuery = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .select('DISTINCT application.applicantId')
        .where('job.created_by = :hrUserId', { hrUserId })
        .getRawMany();

      const totalApplicants = totalApplicantsQuery.length;

      const multipleApplicationsQuery = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .select('application.applicantId')
        .addSelect('COUNT(*)', 'applicationCount')
        .where('job.created_by = :hrUserId', { hrUserId })
        .groupBy('application.applicantId')
        .having('COUNT(*) >= 2')
        .getRawMany();

      const multipleApplicationsCount = multipleApplicationsQuery.length;

      const highMatchingQuery = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .select('DISTINCT application.applicantId')
        .where('job.created_by = :hrUserId', { hrUserId })
        .andWhere('application.matchingScore >= :score', { score: 80 })
        .getRawMany();

      const highMatchingCount = highMatchingQuery.length;

      return {
        totalApplicants,
        multipleApplicationsCount,
        highMatchingCount,
      };
    }

    const totalApplicantsQuery = await this.applicationRepository
      .createQueryBuilder('application')
      .select('COUNT(DISTINCT application.applicantId)', 'count')
      .getRawOne();

    const totalApplicants = parseInt(totalApplicantsQuery?.count) || 0;

    const multipleApplicationsQuery = await this.applicationRepository
      .createQueryBuilder('application')
      .select('application.applicantId')
      .addSelect('COUNT(*)', 'applicationCount')
      .groupBy('application.applicantId')
      .having('COUNT(*) >= 2')
      .getRawMany();

    const multipleApplicationsCount = multipleApplicationsQuery.length;

    const highMatchingQuery = await this.applicationRepository
      .createQueryBuilder('application')
      .select('DISTINCT application.applicantId')
      .where('application.matchingScore >= :score', { score: 80 })
      .getRawMany();

    const highMatchingCount = highMatchingQuery.length;

    return {
      totalApplicants,
      multipleApplicationsCount,
      highMatchingCount,
    };
  }
}
