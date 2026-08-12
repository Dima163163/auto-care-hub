import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum BookingPaymentAttemptStatus {
    Creating = 'creating',
    Created = 'created',
    Failed = 'failed',
    Paid = 'paid',
    Expired = 'expired',
}

@Entity('booking_payment_attempts')
@Index('UQ_booking_payment_attempts_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('UQ_booking_payment_attempts_payment_attempt_number', ['paymentId', 'attemptNumber'], { unique: true })
@Index('UQ_booking_payment_attempts_stripe_session', ['stripeSessionId'], {
    unique: true,
    where: '"stripe_session_id" IS NOT NULL',
})
@Index('IDX_booking_payment_attempts_payment_created', ['paymentId', 'createdAt'])
@Check('CHK_booking_payment_attempts_attempt_number', '"attempt_number" > 0')
export class BookingPaymentAttemptEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId!: string

    @Column({ name: 'booking_id', type: 'uuid' })
    bookingId!: string

    @Column({ name: 'attempt_number', type: 'integer' })
    attemptNumber!: number

    @Column({ name: 'idempotency_key', type: 'text' })
    idempotencyKey!: string

    @Column({ name: 'client_idempotency_key', type: 'text', nullable: true })
    clientIdempotencyKey!: string | null

    @Column({
        type: 'enum',
        enum: BookingPaymentAttemptStatus,
        enumName: 'booking_payment_attempt_status',
        default: BookingPaymentAttemptStatus.Creating,
    })
    status!: BookingPaymentAttemptStatus

    @Column({ name: 'stripe_session_id', type: 'text', nullable: true })
    stripeSessionId!: string | null

    @Column({ name: 'checkout_url', type: 'text', nullable: true })
    checkoutUrl!: string | null

    @Column({ name: 'failure_message', type: 'text', nullable: true })
    failureMessage!: string | null

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date
}
