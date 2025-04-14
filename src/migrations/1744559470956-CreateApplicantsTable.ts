import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplicantsTable1744559470956 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE applicants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE applicants;
    `);
  }
}
