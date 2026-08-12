import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum BookingPaymentDisputeStatus {
    Open = 'open',
    FundsWithdrawn = 'funds_withdrawn',
    FundsReinstated = 'funds_reinstated',
    Closed = 'closed',
}

@Entity('booking_payment_disputes')
@Index('UQ_booking_payment_disputes_provider_id', ['providerDisputeId'], { unique: true })
@Index('IDX_booking_payment_disputes_payment_created', ['paymentId', 'createdAt', 'id'])
@Check('CHK_booking_payment_disputes_amount', '"amount_minor" > 0')
export class BookingPaymentDisputeEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId!: string

    @Column({ name: 'booking_id', type: 'uuid' })
    bookingId!: string

    @Column({ name: 'provider_dispute_id', type: 'text' })
    providerDisputeId!: string

    @Column({ name: 'provider_charge_id', type: 'text', nullable: true })
    providerChargeId!: string | null

    @Column({ name: 'amount_minor', type: 'integer' })
    amountMinor!: number

    @Column({ type: 'text' })
    currency!: string

    @Column({ type: 'text' })
    reason!: string

    @Column({ name: 'provider_status', type: 'text' })
    providerStatus!: string

    @Column({
        type: 'enum',
        enum: BookingPaymentDisputeStatus,
        enumName: 'booking_payment_dispute_status',
    })
    status!: BookingPaymentDisputeStatus

    @Column({ name: 'last_event_id', type: 'text' })
    lastEventId!: string

    @Column({ name: 'last_event_created_at', type: 'timestamptz' })
    lastEventCreatedAt!: Date

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date
}
