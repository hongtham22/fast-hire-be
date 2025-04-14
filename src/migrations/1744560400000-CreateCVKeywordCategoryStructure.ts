import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCVKeywordCategoryStructure1744560400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop table cv_keywords if exists
    await queryRunner.query(`DROP TABLE IF EXISTS cv_keywords CASCADE;`);

    // Create new cv_keywords table
    await queryRunner.query(`
      CREATE TABLE cv_keywords (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id UUID NOT NULL UNIQUE,
        extracted_text TEXT,
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );
    `);

    // Create cv_categories table
    await queryRunner.query(`
      CREATE TABLE cv_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create cv_keyword_category table
    await queryRunner.query(`
      CREATE TABLE cv_keyword_category (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cv_keyword_id UUID NOT NULL,
        category_id UUID NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_cv_keyword FOREIGN KEY (cv_keyword_id) REFERENCES cv_keywords(id) ON DELETE CASCADE,
        CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES cv_categories(id) ON DELETE CASCADE
      );
    `);

    // Create necessary indexes
    await queryRunner.query(`
      CREATE INDEX idx_cv_keyword_category_cv_keyword_id ON cv_keyword_category(cv_keyword_id);
      CREATE INDEX idx_cv_keyword_category_category_id ON cv_keyword_category(category_id);
      CREATE INDEX idx_cv_keyword_category_value ON cv_keyword_category USING GIN (value);
    `);

    // Add some default categories
    await queryRunner.query(`
      INSERT INTO cv_categories (name) VALUES 
      ('candidate'),
      ('certificate'),
      ('education'),
      ('experience'),
      ('language'),
      ('programing_langugue'),
      ('soft_skill'),
      ('technical_skill')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cv_keyword_category;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cv_categories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cv_keywords;`);
  }
}
