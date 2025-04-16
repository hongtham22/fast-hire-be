import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/application.entity';
import { User } from '../../users/user.entity';
import { EmailTemplate } from './email-template.entity';

@Entity('mail_logs')
export class MailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'email_template_id', nullable: true })
  emailTemplateId: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'sent_at', type: 'timestamp', default: () => 'NOW()' })
  sentAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  // Relations
  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @ManyToOne(() => EmailTemplate)
  @JoinColumn({ name: 'email_template_id' })
  emailTemplate: EmailTemplate;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
