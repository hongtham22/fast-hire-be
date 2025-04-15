import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class SeedMoreJobsData1744600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // get HR user UUID
    const hrUserResult = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'hr@fasthire.com' LIMIT 1;
    `);

    if (hrUserResult.length === 0) {
      console.warn(
        'HR user not found. Please run the SeedInitialData migration first.',
      );
      return;
    }

    const hrUserId = hrUserResult[0].id;

    // Read jobs data from JSON file
    const jobsPath = path.join(__dirname, '..', 'seeds', 'jobs.json');
    const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));

    // Insert each job from the JSON file
    for (const job of jobsData) {
      await queryRunner.query(
        `
        INSERT INTO jobs (
          job_title,
          location,
          experience_year,
          must_have,
          nice_to_have,
          language_skills,
          our_offer,
          key_responsibility,
          created_by,
          expire_date,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '30 days', $10
        )
        `,
        [
          job.job_title,
          job.location,
          job.experience_year,
          job.must_have,
          job.nice_to_have,
          job.language_skills,
          job.our_offer,
          job.key_responsibility,
          hrUserId,
          job.status,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete jobs when rolling back
    await queryRunner.query(`DELETE FROM jobs WHERE created_by = (
      SELECT id FROM users WHERE email = 'hr@fasthire.com'
    );`);
  }
}
