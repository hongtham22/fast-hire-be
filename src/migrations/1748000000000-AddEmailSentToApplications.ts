import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailSentToApplications1748000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE applications
      DROP COLUMN IF EXISTS email_sent
    `);
  }
}
