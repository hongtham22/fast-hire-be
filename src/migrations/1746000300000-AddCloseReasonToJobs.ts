import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCloseReasonToJobs1746000300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS close_reason VARCHAR;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN IF EXISTS close_reason;
    `);
  }
}
