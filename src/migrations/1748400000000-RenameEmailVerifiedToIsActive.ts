import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEmailVerifiedToIsActive1748400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN is_email_verified TO is_active;
    `);

    // Set all existing users to active (since they were auto-verified before)
    await queryRunner.query(`
      UPDATE users SET is_active = true WHERE is_active IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN is_active TO is_email_verified;
    `);
  }
}
