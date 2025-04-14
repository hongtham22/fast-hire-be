import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedJDKeywordData1744570100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lấy ID của job "Senior Ruby on Rails Developer"
    const jobResult = await queryRunner.query(`
      SELECT id FROM jobs WHERE job_title = 'Senior Ruby on Rails Developer' LIMIT 1;
    `);

    if (jobResult.length === 0) {
      console.warn(
        'Job "Senior Ruby on Rails Developer" not found. Please run the SeedJobData migration first.',
      );
      return;
    }

    const jobId = jobResult[0].id;

    // Tạo JD keyword cho job
    const jdKeywordResult = await queryRunner.query(`
      INSERT INTO jd_keywords (job_id) 
      VALUES ('${jobId}')
      RETURNING id;
    `);

    const jdKeywordId = jdKeywordResult[0].id;

    // Get all categories
    const categoriesResult = await queryRunner.query(`
      SELECT id, name FROM jd_categories;
    `);

    // Create map to easily get category id by name
    const categoryMap = {};
    categoriesResult.forEach((category) => {
      categoryMap[category.name] = category.id;
    });

    // Add data for education
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['education']}',
        '[
          {
            "degree": {
              "requirement_type": "must_have",
              "value": "Bachelor"
            },
            "major": {
              "requirement_type": "must_have",
              "value": "Computer Science"
            }
          }
        ]'::jsonb
      );
    `);

    // Add data for experience_years
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['experience_years']}',
        '${JSON.stringify({
          requirement_type: 'must_have',
          value: '5',
        })}'::jsonb
      );
    `);

    // Add data for key_responsibilities
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['key_responsibilities']}',
        '[
          {
            "requirement_type": "must_have",
            "value": "Web application development"
          },
          {
            "requirement_type": "must_have",
            "value": "Code quality assurance"
          },
          {
            "requirement_type": "must_have",
            "value": "Database performance optimization"
          },
          {
            "requirement_type": "must_have",
            "value": "Issue resolution"
          },
          {
            "requirement_type": "must_have",
            "value": "Technology research"
          },
          {
            "requirement_type": "must_have",
            "value": "Mentoring"
          },
          {
            "requirement_type": "must_have",
            "value": "Technical documentation"
          }
        ]'::jsonb
      );
    `);

    // Add data for language
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['language']}',
        '[
          {
            "language": {
              "requirement_type": "must_have",
              "value": "English"
            },
            "level": {
              "requirement_type": "must_have",
              "value": "Basic"
            }
          }
        ]'::jsonb
      );
    `);

    // Add data for programing_langugue
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['programing_langugue']}',
        '[
          {
            "requirement_type": "must_have",
            "value": "Ruby"
          }
        ]'::jsonb
      );
    `);

    // Add data for role_job
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['role_job']}',
        '${JSON.stringify({
          requirement_type: 'must_have',
          value: 'Ruby on Rails Developer',
        })}'::jsonb
      );
    `);

    // Add data for soft_skill
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['soft_skill']}',
        '[
          {
            "requirement_type": "must_have",
            "value": "Teamwork"
          },
          {
            "requirement_type": "must_have",
            "value": "Problem-solving"
          },
          {
            "requirement_type": "must_have",
            "value": "Time management"
          }
        ]'::jsonb
      );
    `);

    // Add data for technical_skill
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['technical_skill']}',
        '[
          {
            "requirement_type": "must_have",
            "value": "Ruby on Rails"
          },
          {
            "requirement_type": "must_have",
            "value": "Elasticsearch"
          },
          {
            "requirement_type": "must_have",
            "value": "Solr"
          },
          {
            "requirement_type": "must_have",
            "value": "SOLID principles"
          },
          {
            "requirement_type": "must_have",
            "value": "Design patterns"
          },
          {
            "requirement_type": "must_have",
            "value": "Version control"
          },
          {
            "requirement_type": "must_have",
            "value": "Code reviews"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "VueJS"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "ReactJS"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "CI/CD"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "GCP"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "AWS"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "Apache"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "Nginx"
          },
          {
            "requirement_type": "nice_to_have",
            "value": "Docker"
          }
        ]'::jsonb
      );
    `);

    // Add certificate (empty array)
    await queryRunner.query(`
      INSERT INTO jd_keyword_category (jd_keyword_id, category_id, value)
      VALUES (
        '${jdKeywordId}',
        '${categoryMap['certificate']}',
        '[]'::jsonb
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get ID of job "Senior Ruby on Rails Developer"
    const jobResult = await queryRunner.query(`
      SELECT id FROM jobs WHERE job_title = 'Senior Ruby on Rails Developer' LIMIT 1;
    `);

    if (jobResult.length === 0) {
      return;
    }

    const jobId = jobResult[0].id;

    // Get ID of jd_keyword
    const jdKeywordResult = await queryRunner.query(`
      SELECT id FROM jd_keywords WHERE job_id = '${jobId}' LIMIT 1;
    `);

    if (jdKeywordResult.length === 0) {
      return;
    }

    const jdKeywordId = jdKeywordResult[0].id;

    // Delete all categories
    await queryRunner.query(`
      DELETE FROM jd_keyword_category WHERE jd_keyword_id = '${jdKeywordId}';
    `);

    // Delete jd_keyword
    await queryRunner.query(`
      DELETE FROM jd_keywords WHERE id = '${jdKeywordId}';
    `);
  }
}
