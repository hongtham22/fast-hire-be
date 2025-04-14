import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Job } from '../jobs/job.entity';
import { JDKeywordCategory } from './jd-keyword-category.entity';

@Entity('jd_keywords')
export class JDKeyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', unique: true })
  jobId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Job, (job) => job.jdKeyword, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @OneToMany(() => JDKeywordCategory, (category) => category.jdKeyword)
  categories: JDKeywordCategory[];
}
