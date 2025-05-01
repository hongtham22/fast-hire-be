import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CVKeywordCategory } from './cv-keyword-category.entity';

@Entity('cv_categories')
export class CVCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => CVKeywordCategory,
    (cvKeywordCategory) => cvKeywordCategory.category,
  )
  cvKeywordCategories: CVKeywordCategory[];
}
