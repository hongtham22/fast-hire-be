import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleMailLogsPerApplication1745100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing UNIQUE constraint on application_id
    await queryRunner.query(`
      ALTER TABLE mail_logs
      DROP CONSTRAINT IF EXISTS mail_logs_application_id_key;
    `);

    // Ensure the foreign key constraint is still in place
    await queryRunner.query(`
      ALTER TABLE mail_logs
      DROP CONSTRAINT IF EXISTS mail_logs_application_id_fkey;
      
      ALTER TABLE mail_logs
      ADD CONSTRAINT mail_logs_application_id_fkey
      FOREIGN KEY (application_id)
      REFERENCES applications(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the UNIQUE constraint
    await queryRunner.query(`
      ALTER TABLE mail_logs
      ADD CONSTRAINT mail_logs_application_id_key
      UNIQUE (application_id);
    `);
  }
}
