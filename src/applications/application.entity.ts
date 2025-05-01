import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Applicant } from '../applicants/applicant.entity';
import { CVKeyword } from '../cv_keywords/cv-keyword.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_id', nullable: true })
  applicantId: string;

  @Column({ name: 'job_id', nullable: true })
  jobId: string;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt: Date;

  @Column({ name: 'cv_file_url' })
  cvFileUrl: string;

  @Column({
    name: 'matching_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  matchingScore: number;

  @Column({ name: 'missing_feedback', type: 'text', nullable: true })
  missingFeedback: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string;

  @Column({ name: 'result', type: 'boolean', nullable: true })
  result: boolean;

  @ManyToOne(() => Applicant, (applicant) => applicant.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicant_id' })
  applicant: Applicant;

  @ManyToOne(() => Job, (job) => job.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @OneToOne(() => CVKeyword, (cvKeyword) => cvKeyword.application, {
    cascade: true,
  })
  cvKeyword: CVKeyword;
}
