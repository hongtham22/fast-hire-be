import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxScoreColumns1748345678902 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add max score columns to the jobs table
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN max_score_role_job INT DEFAULT 10,
      ADD COLUMN max_score_experience_years INT DEFAULT 15,
      ADD COLUMN max_score_programming_language INT DEFAULT 15,
      ADD COLUMN max_score_key_responsibilities INT DEFAULT 15,
      ADD COLUMN max_score_certificate INT DEFAULT 10,
      ADD COLUMN max_score_language INT DEFAULT 10,
      ADD COLUMN max_score_soft_skill INT DEFAULT 10,
      ADD COLUMN max_score_technical_skill INT DEFAULT 15;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if migration is reverted
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN IF EXISTS max_score_role_job,
      DROP COLUMN IF EXISTS max_score_experience_years,
      DROP COLUMN IF EXISTS max_score_programming_language,
      DROP COLUMN IF EXISTS max_score_key_responsibilities,
      DROP COLUMN IF EXISTS max_score_certificate,
      DROP COLUMN IF EXISTS max_score_language,
      DROP COLUMN IF EXISTS max_score_soft_skill,
      DROP COLUMN IF EXISTS max_score_technical_skill;
    `);
  }
}
