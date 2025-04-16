import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailTemplateAndMailLog1744800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_templates table
    await queryRunner.query(`
      CREATE TABLE email_templates (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        subject_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create mail_logs table
    await queryRunner.query(`
      CREATE TABLE mail_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        application_id UUID REFERENCES applications(id) UNIQUE,
        email_template_id UUID REFERENCES email_templates(id),
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      );
    `);

    // Add default templates
    await queryRunner.query(`
      INSERT INTO email_templates (name, subject_template, body_template)
      VALUES 
        ('Application Received', 
         'Thank you for your application to {{position}}', 
         '<p>Dear {{candidate_name}},</p>
          <p>Thank you for applying to the {{position}} position at our company. We have received your application and our team will review it shortly.</p>
          <p>We will contact you if your qualifications match our requirements for the role.</p>
          <p>Best regards,<br>Recruitment Team</p>'),
        
        ('Interview Invitation', 
         'Interview Invitation for {{position}}', 
         '<p>Dear {{candidate_name}},</p>
          <p>We are pleased to invite you for an interview for the {{position}} position. Your qualifications and experience have impressed our hiring team.</p>
          <p>Your interview is scheduled for: {{interview_date}} at {{interview_time}}.</p>
          <p>Please confirm your attendance by replying to this email.</p>
          <p>Best regards,<br>Recruitment Team</p>'),
        
        ('Application Accepted', 
         'Congratulations! Your application for {{position}} has been accepted', 
         '<p>Dear {{candidate_name}},</p>
          <p>We are delighted to inform you that your application for the {{position}} position has been accepted.</p>
          <p>We would like to extend an offer to you to join our team. The details of the offer will be sent to you shortly.</p>
          <p>Congratulations and welcome to our team!</p>
          <p>Best regards,<br>Recruitment Team</p>'),
        
        ('Application Rejected', 
         'Regarding your application for {{position}}', 
         '<p>Dear {{candidate_name}},</p>
          <p>Thank you for your interest in the {{position}} position and for taking the time to apply.</p>
          <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications better match our current needs.</p>
          <p>We appreciate your interest in our company and wish you the best in your job search.</p>
          <p>Best regards,<br>Recruitment Team</p>');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS mail_logs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_templates;`);
  }
}
