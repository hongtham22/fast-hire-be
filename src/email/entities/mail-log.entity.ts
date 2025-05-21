import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EmailTemplate } from './email-template.entity';
import { User } from '@/users/user.entity';
import { Application } from '@/applications/application.entity';

@Entity('mail_logs')
export class MailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', nullable: true })
  application_id: string;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'email_template_id', nullable: true })
  email_template_id: string;

  @ManyToOne(() => EmailTemplate)
  @JoinColumn({ name: 'email_template_id' })
  emailTemplate: EmailTemplate;

  @Column()
  subject: string;

  @Column()
  message: string;

  @Column({ name: 'sent_at', default: () => 'NOW()' })
  sent_at: Date;

  @Column({ name: 'created_by', nullable: true })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
