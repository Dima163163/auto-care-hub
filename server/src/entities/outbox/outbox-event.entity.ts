import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export enum OutboxEventStatus {
    Pending = 'pending',
    Processing = 'processing',
    Completed = 'completed',
    Failed = 'failed',
    DeadLetter = 'dead_letter',
}

@Entity('outbox_events')
@Index(['status', 'availableAt'])
export class OutboxEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text' })
    type!: string

    @Column({ type: 'jsonb' })
    payload!: Record<string, unknown>

    @Column({ type: 'text', unique: true, nullable: true })
    idempotencyKey!: string | null

    @Column({ type: 'enum', enum: OutboxEventStatus, enumName: 'outbox_event_status', default: OutboxEventStatus.Pending })
    status!: OutboxEventStatus

    @Column({ type: 'integer', default: 0 })
    attempts!: number

    @Column({ type: 'timestamptz', default: () => 'now()' })
    availableAt!: Date

    @Column({ type: 'timestamptz', nullable: true })
    lockedAt!: Date | null

    @Column({ type: 'timestamptz', nullable: true })
    processedAt!: Date | null

    @Column({ type: 'text', nullable: true })
    lastError!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
