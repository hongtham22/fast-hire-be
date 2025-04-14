import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInitialData1710400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // admin password hash
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // hr password hash
    const hrPasswordHash = await bcrypt.hash('hr123', 10);

    // add admin
    await queryRunner.query(`
      INSERT INTO users (name, email, password_hash, role, is_email_verified)
      VALUES (
        'Admin User', 
        'admin@fasthire.com', 
        '${adminPasswordHash}', 
        'admin', 
        true
      );
    `);

    // add HR
    await queryRunner.query(`
      INSERT INTO users (name, email, password_hash, role, is_email_verified)
      VALUES (
        'HR Manager', 
        'hr@fasthire.com', 
        '${hrPasswordHash}', 
        'hr', 
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // delete data when rollback
    await queryRunner.query(`
      DELETE FROM users 
      WHERE email IN ('admin@fasthire.com', 'hr@fasthire.com');
    `);
  }
}
