import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdjustJDKeywordCategoryStructure1744570000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Xóa bảng cũ nếu tồn tại
    await queryRunner.query(
      `DROP TABLE IF EXISTS jd_keyword_category CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS jd_categories CASCADE;`);

    // Tạo bảng jd_categories với tên category duy nhất
    await queryRunner.query(`
      CREATE TABLE jd_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Thêm các category mặc định
    await queryRunner.query(`
      INSERT INTO jd_categories (name) VALUES 
      ('certificate'),
      ('education'),
      ('experience_years'),
      ('key_responsibilities'),
      ('language'),
      ('programming_language'),
      ('role_job'),
      ('soft_skill'),
      ('technical_skill')
    `);

    // Tạo lại bảng jd_keyword_category với cấu trúc mới
    await queryRunner.query(`
      CREATE TABLE jd_keyword_category (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        jd_keyword_id UUID NOT NULL,
        category_id UUID NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_jd_keyword FOREIGN KEY (jd_keyword_id) REFERENCES jd_keywords(id) ON DELETE CASCADE,
        CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES jd_categories(id) ON DELETE CASCADE
      );
    `);

    // Tạo các index cần thiết
    await queryRunner.query(`
      CREATE INDEX idx_jd_keyword_category_jd_keyword_id ON jd_keyword_category(jd_keyword_id);
      CREATE INDEX idx_jd_keyword_category_category_id ON jd_keyword_category(category_id);
      CREATE INDEX idx_jd_keyword_category_value ON jd_keyword_category USING GIN (value);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS jd_keyword_category CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS jd_categories CASCADE;`);
  }
}
