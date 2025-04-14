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

export enum JobStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CLOSED = 'closed',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_title' })
  jobTitle: string;

  @Column()
  location: string;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @OneToOne(() => JDKeyword, (jdKeyword) => jdKeyword.job)
  jdKeyword: JDKeyword;
}
