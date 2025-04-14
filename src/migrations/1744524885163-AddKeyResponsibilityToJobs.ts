import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeyResponsibilityToJobs1744524885163
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN key_responsibility TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN key_responsibility;
    `);
  }
}
