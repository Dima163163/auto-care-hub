import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { getOutboxPayloadRecordId, outboxPayloadEncryptionTransformer, setOutboxPayloadRecordId } from '../../shared/security/data-encryption/field-encryption.js'

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
    id: string = randomUUID()

    @Column({ type: 'text' })
    type!: string

    @Column({ type: 'jsonb', transformer: outboxPayloadEncryptionTransformer })
    get payload(): Record<string, unknown> {
        if (this._payload && this.id && !getOutboxPayloadRecordId(this._payload)) {
            setOutboxPayloadRecordId(this._payload, this.id)
        }
        return this._payload
    }

    set payload(value: Record<string, unknown>) {
        Object.defineProperty(this, '_payload', {
            value,
            writable: true,
            configurable: true,
            enumerable: false,
        })
    }

    private _payload!: Record<string, unknown>

    toJSON() {
        return { ...this, payload: this.payload }
    }

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
