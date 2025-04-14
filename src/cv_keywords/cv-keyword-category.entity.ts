import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { CVKeyword } from './cv-keyword.entity';
import { Category } from './category.entity';

@Entity('cv_keyword_category')
export class CVKeywordCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cv_keyword_id' })
  cvKeywordId: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'jsonb' })
  value: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CVKeyword, (cvKeyword) => cvKeyword.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cv_keyword_id' })
  cvKeyword: CVKeyword;

  @ManyToOne(() => Category, (category) => category.cvKeywordCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
