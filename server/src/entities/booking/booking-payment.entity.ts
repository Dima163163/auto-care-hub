import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export enum BookingPaymentStatus {
    Pending = 'pending',
    Paid = 'paid',
    Failed = 'failed',
    PartiallyRefunded = 'partially_refunded',
    Refunded = 'refunded',
}

@Entity('booking_payments')
@Index(['bookingId'], { unique: true })
@Index('IDX_booking_payments_created_at_id', ['createdAt', 'id'])
@Index('IDX_booking_payments_status_created_at', ['status', 'createdAt', 'id'])
@Check('CHK_booking_payments_refunded_amount', '"refunded_amount" >= 0 AND "refunded_amount" <= ("grossAmount" * 100)')
export class BookingPaymentEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    bookingId!: string

    @Column({ type: 'integer' })
    grossAmount!: number

    @Column({ type: 'integer' })
    commissionAmount!: number

    @Column({ type: 'integer' })
    ownerPayoutAmount!: number

    @Column({ name: 'refunded_amount', type: 'integer', default: 0 })
    refundedAmountMinor!: number

    @Column({ type: 'text', default: 'rub' })
    currency!: string

    @Column({ type: 'enum', enum: BookingPaymentStatus, default: BookingPaymentStatus.Pending })
    status!: BookingPaymentStatus

    @Column({ type: 'text', nullable: true })
    stripeSessionId!: string | null

    @Column({ type: 'text', nullable: true })
    stripePaymentIntentId!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
