import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MailLog } from './mail-log.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  subject_template: string;

  @Column()
  body_template: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relation with mail logs
  @OneToMany(() => MailLog, (mailLog) => mailLog.emailTemplate)
  mailLogs: MailLog[];
}
