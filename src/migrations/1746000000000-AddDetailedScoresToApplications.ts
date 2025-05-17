import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDetailedScoresToApplications1746000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if any of these columns already exist
    const result = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='applications' AND column_name='role_score'
    `);

    // Only add columns if they don't exist
    if (result.length === 0) {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove rounded score columns
    await queryRunner.query(`
      ALTER TABLE applications
      DROP COLUMN IF EXISTS role_score,
      DROP COLUMN IF EXISTS exp_score,
      DROP COLUMN IF EXISTS programming_score,
      DROP COLUMN IF EXISTS technical_score,
      DROP COLUMN IF EXISTS soft_score,
      DROP COLUMN IF EXISTS langs_score,
      DROP COLUMN IF EXISTS key_score,
      DROP COLUMN IF EXISTS cert_score
    `);
  }
}
