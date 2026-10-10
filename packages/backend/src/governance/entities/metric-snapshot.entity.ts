import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One reading of one metric for a Unit of Work at a point in time
 * (e.g. upvotes on today's Reddit posts). Daily measurement aggregates these.
 */
@Entity('metric_snapshots')
@Index(['unitOfWorkId', 'metricKey', 'capturedAt'])
export class MetricSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unitOfWorkId: string;

  /** The Task that produced the reading, when it came from one. */
  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'varchar', length: 100 })
  metricKey: string;

  @Column({ type: 'double precision' })
  value: number;

  @CreateDateColumn({ type: 'timestamptz' })
  capturedAt: Date;
}
