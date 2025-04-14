import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { JDKeywordCategory } from './jd-keyword-category.entity';

@Entity('jd_categories')
export class JDCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => JDKeywordCategory,
    (jdKeywordCategory) => jdKeywordCategory.category,
  )
  jdKeywordCategories: JDKeywordCategory[];
}
