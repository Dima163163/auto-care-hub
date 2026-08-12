import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export enum StripeWebhookEventStatus {
    Processing = 'processing',
    Processed = 'processed',
    Failed = 'failed',
    Unmatched = 'unmatched',
}

@Entity('stripe_webhook_events')
@Index(['stripeEventId'], { unique: true })
@Index('IDX_stripe_webhook_events_status_lease', ['status', 'leaseExpiresAt'])
export class StripeWebhookEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'stripe_event_id', type: 'text' })
    stripeEventId!: string

    @Column({ name: 'event_type', type: 'text' })
    eventType!: string

    @Column({
        type: 'enum',
        enum: StripeWebhookEventStatus,
        enumName: 'stripe_webhook_event_status',
        default: StripeWebhookEventStatus.Processing,
    })
    status!: StripeWebhookEventStatus

    @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
    processedAt!: Date | null

    @Column({ name: 'last_error', type: 'text', nullable: true })
    lastError!: string | null

    @Column({ name: 'lease_token', type: 'text', nullable: true })
    leaseToken!: string | null

    @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true })
    leaseExpiresAt!: Date | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date
}
