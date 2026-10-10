import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TaskEntity } from './task.entity';
import { UnitOfWorkEntity } from './unit-of-work.entity';

/**
 * A set of related Tasks with one clear objective, tagged to a Unit of Work.
 */
@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unitOfWorkId: string;

  @ManyToOne(() => UnitOfWorkEntity, (unit) => unit.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitOfWorkId' })
  unitOfWork: UnitOfWorkEntity;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  objective: string;

  @OneToMany(() => TaskEntity, (task) => task.job)
  tasks: TaskEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
