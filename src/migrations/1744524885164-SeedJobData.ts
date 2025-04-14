import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedJobData1744524885164 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // get HR user UUID
    const hrUserResult = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'hr@fasthire.com' LIMIT 1;
    `);

    if (hrUserResult.length === 0) {
      console.warn(
        'HR user not found. Please run the SeedInitialData migration first.',
      );
      return;
    }

    const hrUserId = hrUserResult[0].id;

    // create a new job
    await queryRunner.query(`
      INSERT INTO jobs (
        job_title,
        location,
        experience_year,
        must_have,
        nice_to_have,
        language_skills,
        our_offer,
        key_responsibility,
        created_by,
        expire_date,
        status
      ) VALUES (
        'Senior Ruby on Rails Developer',
        'Ha Noi',
        5,
        '- Graduated from a college or university with a degree in Information Technology or Computer Science.
    - 5+years of software development experience, with a focus on web applications technologies, work experience in Ruby on Rails framework.
    - 3+years experience in working with Search Engine (Elasticsearch, Solr).
    - Proficient in software engineering best practices throughout the development life cycle (coding standards, code reviews, version control, build processes, testing, operations, monitoring, etc.).
    - Strong at SOLID principles, design patterns, and optimizing website performance.
    - Strong teamwork, problem-solving, and good time management skills.
    - Highly motivated, with a "Can do attitude" and a product (client) mindset.
    - Can work effectively under high pressure.',
        '- Experienced with FE and JS framework: VueJS, ReactJS.
    - Knowledge of CI/CD methodologies is preferable.
    - Knowledge of Cloud services such as GCP, and AWS is preferable.
    - Experienced with Apache or Nginx Web Server and Docker configuration.',
        '- Communicate basically in English (writing, reading)',
        '- Attractive salary based on your skills.
- 100% salary during the 2-month probation period.
- 13th-month salary and performance-based bonuses.
- 15-18 days of paid leave per year for employees with over 1 year of service.
- MacBook/ Laptop provided to meet your work requirements.
- Language support programs for learning Japanese and English.
- Performance appraisal and salary review twice a year.
- Full gross salary payment for compulsory insurance.
- Awards for outstanding performance on a quarterly and yearly basis.',
        '- Analyze system requirements, and develop web applications.
    - Ensure code quality, adhere to SOLID principles, apply design patterns, and optimize database performance.
    - Coordinate with the Project Manager and Bridge SE to resolve issues.
    - Coordinate with team members to resolve technical issues.
    - Research and develop new technology related to the project.
    - Mentor team members by sharing expertise, conducting code reviews, aligning strictly with coding standards, and suggesting best practices.
    - Help the team to detect and solve an issue as operating the whole system or in daily workflow.
    - Write technical documentation.',
        '${hrUserId}',
        (NOW() + INTERVAL '30 days'),
        'approved'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // delete data when rollback
    await queryRunner.query(`
      DELETE FROM jobs WHERE job_title = 'Senior Ruby on Rails Developer' AND location = 'Ha Noi';
    `);
  }
}
