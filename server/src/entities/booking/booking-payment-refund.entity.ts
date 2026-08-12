import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm'

export enum BookingPaymentRefundStatus {
    Pending = 'pending',
    Succeeded = 'succeeded',
    Failed = 'failed',
    Canceled = 'canceled',
}

@Entity('booking_payment_refunds')
@Index('UQ_booking_payment_refunds_provider_id', ['providerRefundId'], { unique: true })
@Index('IDX_booking_payment_refunds_payment_created', ['paymentId', 'createdAt', 'id'])
@Check('CHK_booking_payment_refunds_amount', '"amount_minor" > 0')
export class BookingPaymentRefundEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId!: string

    @Column({ name: 'booking_id', type: 'uuid' })
    bookingId!: string

    @Column({ name: 'provider_refund_id', type: 'text' })
    providerRefundId!: string

    @Column({ name: 'provider_charge_id', type: 'text', nullable: true })
    providerChargeId!: string | null

    @Column({ name: 'amount_minor', type: 'integer' })
    amountMinor!: number

    @Column({ type: 'text' })
    currency!: string

    @Column({ type: 'text', nullable: true })
    reason!: string | null

    @Column({
        type: 'enum',
        enum: BookingPaymentRefundStatus,
        enumName: 'booking_payment_refund_status',
        default: BookingPaymentRefundStatus.Succeeded,
    })
    status!: BookingPaymentRefundStatus

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date
}
