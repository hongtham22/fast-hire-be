import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLocationsTable1744900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create locations table
    await queryRunner.query(`
      CREATE TABLE locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert initial locations based on existing job locations
    await queryRunner.query(`
      INSERT INTO locations (name)
      SELECT DISTINCT location FROM jobs
      WHERE location IS NOT NULL AND location != '';
    `);

    // Add location_id column to jobs table
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD COLUMN location_id UUID;
    `);

    // Update jobs with corresponding location_id
    await queryRunner.query(`
      UPDATE jobs
      SET location_id = locations.id
      FROM locations
      WHERE jobs.location = locations.name;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE jobs
      ADD CONSTRAINT fk_location
      FOREIGN KEY (location_id)
      REFERENCES locations(id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP CONSTRAINT IF EXISTS fk_location;
    `);

    // Drop the location_id column
    await queryRunner.query(`
      ALTER TABLE jobs
      DROP COLUMN IF EXISTS location_id;
    `);

    // Drop the locations table
    await queryRunner.query(`
      DROP TABLE IF EXISTS locations;
    `);
  }
}
