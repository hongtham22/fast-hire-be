import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Application } from '../applications/application.entity';
import { JDKeyword } from '../jd_keywords/jd-keyword.entity';
import { Location } from '../locations/location.entity';

export enum JobStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_title' })
  jobTitle: string;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @Column({ name: 'experience_year' })
  experienceYear: number;

  @Column({ name: 'must_have', type: 'text' })
  mustHave: string;

  @Column({ name: 'nice_to_have', type: 'text', nullable: true })
  niceToHave: string;

  @Column({ name: 'language_skills', type: 'text', nullable: true })
  languageSkills: string;

  @Column({ name: 'our_offer', type: 'text', nullable: true })
  ourOffer: string;

  @Column({ name: 'key_responsibility', type: 'text', nullable: true })
  keyResponsibility: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'expire_date', type: 'timestamp', nullable: true })
  expireDate: Date;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ name: 'close_reason', nullable: true })
  closeReason: 'manual' | 'expired' | null;

  // Custom max scores for each matching criterion
  @Column({ name: 'max_score_role_job', type: 'int', default: 10 })
  maxScoreRoleJob: number;

  @Column({ name: 'max_score_experience_years', type: 'int', default: 15 })
  maxScoreExperienceYears: number;

  @Column({ name: 'max_score_programming_language', type: 'int', default: 15 })
  maxScoreProgrammingLanguage: number;

  @Column({ name: 'max_score_key_responsibilities', type: 'int', default: 15 })
  maxScoreKeyResponsibilities: number;

  @Column({ name: 'max_score_certificate', type: 'int', default: 10 })
  maxScoreCertificate: number;

  @Column({ name: 'max_score_language', type: 'int', default: 10 })
  maxScoreLanguage: number;

  @Column({ name: 'max_score_soft_skill', type: 'int', default: 10 })
  maxScoreSoftSkill: number;

  @Column({ name: 'max_score_technical_skill', type: 'int', default: 15 })
  maxScoreTechnicalSkill: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @OneToOne(() => JDKeyword, (jdKeyword) => jdKeyword.job)
  jdKeyword: JDKeyword;

  // Virtual property (not stored in database)
  applicationCount?: number;
}
