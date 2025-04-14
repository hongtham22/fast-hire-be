import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsTable1744524885162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE job_status AS ENUM ('pending', 'approved', 'closed');
      `);

    await queryRunner.query(`
      CREATE TABLE jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_title VARCHAR,
        location VARCHAR,
        experience_year INTEGER,
        must_have TEXT,
        nice_to_have TEXT,
        language_skills TEXT,
        our_offer TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT now(),
        expire_date TIMESTAMP,
        status job_status,
        CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE jobs;
      DROP TYPE job_status; 
    `);
  }
}
