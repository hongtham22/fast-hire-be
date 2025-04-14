import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1710300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TYPE user_role AS ENUM ('admin', 'hr');
        
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR,
            email VARCHAR UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role user_role NOT NULL,
            is_email_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT now()
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE users;
        DROP TYPE user_role;
    `);
  }
}
