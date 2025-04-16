import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MailLog } from './mail-log.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'subject_template' })
  subjectTemplate: string;

  @Column({ name: 'body_template', type: 'text' })
  bodyTemplate: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;

  // Relation with mail logs
  @OneToMany(() => MailLog, (mailLog) => mailLog.emailTemplate)
  mailLogs: MailLog[];
}
