import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Job } from '../jobs/job.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Job, (job) => job.location)
  jobs: Job[];
}
