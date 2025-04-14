import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { JDKeyword } from './jd-keyword.entity';
import { JDCategory } from './jd-category.entity';

@Entity('jd_keyword_category')
export class JDKeywordCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'jd_keyword_id' })
  jdKeywordId: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'jsonb' })
  value: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => JDKeyword, (jdKeyword) => jdKeyword.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jd_keyword_id' })
  jdKeyword: JDKeyword;

  @ManyToOne(() => JDCategory, (category) => category.jdKeywordCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: JDCategory;
}
