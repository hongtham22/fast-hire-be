import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './applicant.entity';
import { CreateApplicantDto } from './dto/create-applicant.dto';

@Injectable()
export class ApplicantsService {
  constructor(
    @InjectRepository(Applicant)
    private applicantRepository: Repository<Applicant>,
  ) {}

  /**
   * Find an applicant by email
   */
  async findByEmail(email: string): Promise<Applicant | null> {
    return this.applicantRepository.findOne({ where: { email } });
  }

  /**
   * Create a new applicant
   */
  async create(createApplicantDto: CreateApplicantDto): Promise<Applicant> {
    const newApplicant = this.applicantRepository.create(createApplicantDto);
    return this.applicantRepository.save(newApplicant);
  }

  /**
   * Find an applicant by email or create a new one if not exists
   * If the applicant exists, update their name and phone number with the latest information
   */
  async findOrCreate(
    createApplicantDto: CreateApplicantDto,
  ): Promise<Applicant> {
    const { email, name, phone } = createApplicantDto;

    // Try to find the applicant by email
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

  /**
   * Find an applicant by ID
   */
  async findOne(id: string): Promise<Applicant> {
    return this.applicantRepository.findOne({
      where: { id },
      relations: ['applications'],
    });
  }

  /**
   * Find all applicants
   */
  async findAll(): Promise<Applicant[]> {
    return this.applicantRepository.find({
      relations: ['applications'],
    });
  }

  /**
   * Update an existing applicant
   */
  async update(id: string, updateData: Partial<Applicant>): Promise<Applicant> {
    await this.applicantRepository.update(id, updateData);
    return this.findOne(id);
  }

  /**
   * Delete all applicants
   */
  async deleteAll(): Promise<void> {
    await this.applicantRepository.delete({});
  }
}
