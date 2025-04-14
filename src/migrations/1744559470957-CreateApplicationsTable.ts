import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplicationsTable1744559470957
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        applicant_id UUID NOT NULL,
        job_id UUID NOT NULL,
        cv_file_url TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT now(),
        matching_score FLOAT,
        missing_feedback TEXT,
        note TEXT,
        result BOOLEAN,
        CONSTRAINT fk_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
        CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE applications;
    `);
  }
}
