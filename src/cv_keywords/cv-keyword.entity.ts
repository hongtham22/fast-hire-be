import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Application } from '../applications/application.entity';
import { CVKeywordCategory } from './cv-keyword-category.entity';

@Entity('cv_keywords')
export class CVKeyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', unique: true })
  applicationId: string;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Application, (application) => application.cvKeyword, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @OneToMany(() => CVKeywordCategory, (category) => category.cvKeyword)
  categories: CVKeywordCategory[];
}
