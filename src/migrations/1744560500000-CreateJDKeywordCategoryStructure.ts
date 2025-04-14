import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJDKeywordCategoryStructure1744560500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old jd_keywords table if exists
    await queryRunner.query(`DROP TABLE IF EXISTS jd_keywords CASCADE;`);

    // Create new jd_keywords table
    await queryRunner.query(`
      CREATE TABLE jd_keywords (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
    `);

    // Create jd_categories table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jd_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create jd_keyword_category table
    await queryRunner.query(`
      CREATE TABLE jd_keyword_category (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        jd_keyword_id UUID NOT NULL,
        category_id UUID NOT NULL,
        value JSONB NOT NULL,
        requirement_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_jd_keyword FOREIGN KEY (jd_keyword_id) REFERENCES jd_keywords(id) ON DELETE CASCADE,
        CONSTRAINT fk_jd_category FOREIGN KEY (category_id) REFERENCES jd_categories(id) ON DELETE CASCADE
      );
    `);

    // Create necessary indexes
    await queryRunner.query(`
      CREATE INDEX idx_jd_keyword_category_jd_keyword_id ON jd_keyword_category(jd_keyword_id);
      CREATE INDEX idx_jd_keyword_category_category_id ON jd_keyword_category(category_id);
      CREATE INDEX idx_jd_keyword_category_value ON jd_keyword_category USING GIN (value);
    `);

    // Add some default jd_categories
    await queryRunner.query(`
      INSERT INTO jd_categories (name) VALUES 
      ('certificate'),
      ('education'),
      ('experience_years'),
      ('key_responsibilities'),
      ('language'),
      ('programing_langugue'),
      ('role_job'),
      ('soft_skill'),
      ('technical_skill')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS jd_keyword_category;`);
    await queryRunner.query(`DROP TABLE IF EXISTS jd_categories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS jd_keywords;`);
  }
}
