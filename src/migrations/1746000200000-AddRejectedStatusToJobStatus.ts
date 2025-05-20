import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedStatusToJobStatus1746000200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'rejected';
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing values from ENUM types
    // We would need to create a new type and migrate the data if we want to remove it
    // For now, we'll leave it as is
  }
}
