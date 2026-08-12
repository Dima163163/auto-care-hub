import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

export enum BookingPaymentInvoiceStatus {
    Open = 'open',
    Paid = 'paid',
    Void = 'void',
}

@Entity('booking_payment_invoices')
@Index('UQ_booking_payment_invoices_payment_id', ['paymentId'], { unique: true })
@Index('UQ_booking_payment_invoices_invoice_id', ['invoiceId'], { unique: true })
@Index('IDX_booking_payment_invoices_status_issued_at', ['status', 'issuedAt', 'id'])
export class BookingPaymentInvoiceEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'payment_id', type: 'uuid' })
    paymentId!: string

    @Column({ name: 'booking_id', type: 'uuid' })
    bookingId!: string

    @Column({ name: 'invoice_id', type: 'text' })
    invoiceId!: string

    @Column({ type: 'integer' })
    amount!: number

    @Column({ type: 'text' })
    currency!: string

    @Column({
        type: 'enum',
        enum: BookingPaymentInvoiceStatus,
        enumName: 'booking_payment_invoice_status',
    })
    status!: BookingPaymentInvoiceStatus

    @Column({ name: 'issued_at', type: 'timestamptz' })
    issuedAt!: Date

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date
}
