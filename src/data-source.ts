import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import { Job } from './jobs/job.entity';
import { Applicant } from './applicants/applicant.entity';
import { Application } from './applications/application.entity';
import { CVKeyword } from './cv_keywords/cv-keyword.entity';
import { JDKeyword } from './jd_keywords/jd-keyword.entity';
import { Category } from './cv_keywords/category.entity';
import { CVKeywordCategory } from './cv_keywords/cv-keyword-category.entity';
import { JDCategory } from './jd_keywords/jd-category.entity';
import { JDKeywordCategory } from './jd_keywords/jd-keyword-category.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PG_HOST || 'db',
  port: parseInt(process.env.PG_PORT || '5432'),
  username: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DB || 'postgres',
  entities: [
    User,
    Job,
    Applicant,
    Application,
    CVKeyword,
    JDKeyword,
    Category,
    CVKeywordCategory,
    JDCategory,
    JDKeywordCategory,
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
