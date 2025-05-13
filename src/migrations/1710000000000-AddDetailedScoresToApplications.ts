import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDetailedScoresToApplications1710000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns for rounded scores (display scores)
    await queryRunner.query(`
            ALTER TABLE applications
            ADD COLUMN role_score DECIMAL(5,2),
            ADD COLUMN exp_score DECIMAL(5,2),
            ADD COLUMN programming_score DECIMAL(5,2),
            ADD COLUMN technical_score DECIMAL(5,2),
            ADD COLUMN soft_score DECIMAL(5,2),
            ADD COLUMN langs_score DECIMAL(5,2),
            ADD COLUMN key_score DECIMAL(5,2),
            ADD COLUMN cert_score DECIMAL(5,2)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove rounded score columns
    await queryRunner.query(`
            ALTER TABLE applications
            DROP COLUMN role_score,
            DROP COLUMN exp_score,
            DROP COLUMN programming_score,
            DROP COLUMN technical_score,
            DROP COLUMN soft_score,
            DROP COLUMN langs_score,
            DROP COLUMN key_score,
            DROP COLUMN cert_score
        `);
  }
}
