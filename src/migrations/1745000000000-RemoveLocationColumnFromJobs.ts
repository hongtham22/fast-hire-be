import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLocationColumnFromJobs1745000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Before dropping the column, ensure all jobs have location_id
    await queryRunner.query(`
      -- Tạo locations mới cho bất kỳ job nào chưa có location_id
      INSERT INTO locations (name)
      SELECT DISTINCT jobs.location
      FROM jobs
      LEFT JOIN locations ON jobs.location = locations.name
      WHERE jobs.location_id IS NULL 
        AND jobs.location IS NOT NULL 
        AND jobs.location != '';
      
      -- Update jobs with corresponding locations
      UPDATE jobs
      SET location_id = locations.id
      FROM locations
      WHERE jobs.location_id IS NULL
        AND jobs.location = locations.name;
    `);

    // Check if there are still jobs without location_id
    const jobsWithoutLocationId = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE location_id IS NULL AND location IS NOT NULL AND location != '';
    `);

    // If there are still jobs without location_id, notify and stop migration
    if (parseInt(jobsWithoutLocationId[0].count) > 0) {
      throw new Error(
        `Still have ${jobsWithoutLocationId[0].count} jobs without location_id. Please check and fix before dropping location column.`,
      );
    }

    // Drop location column
    await queryRunner.query(`
      ALTER TABLE jobs DROP COLUMN location;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add location column back
    await queryRunner.query(`
      ALTER TABLE jobs ADD COLUMN location VARCHAR;
    `);

    // Restore data from locations table
    await queryRunner.query(`
      UPDATE jobs
      SET location = locations.name
      FROM locations
      WHERE jobs.location_id = locations.id;
    `);
  }
}
