import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSeedJobsForLocation1744950000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update jobs with location_id
    await queryRunner.query(`
      UPDATE jobs
      SET location_id = locations.id
      FROM locations
      WHERE jobs.location_id IS NULL
        AND jobs.location = locations.name;
        
      INSERT INTO locations (name)
      SELECT DISTINCT jobs.location
      FROM jobs
      LEFT JOIN locations ON jobs.location = locations.name
      WHERE locations.id IS NULL AND jobs.location IS NOT NULL AND jobs.location != '';
      
      -- Update jobs with location_id
      UPDATE jobs
      SET location_id = locations.id
      FROM locations
      WHERE jobs.location_id IS NULL
        AND jobs.location = locations.name;
    `);
  }

  public async down(): Promise<void> {}
}
