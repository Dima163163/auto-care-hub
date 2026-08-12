import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

import { BookingStatus } from './booking.entity.js'

@Entity('booking_status_history')
@Index(['bookingId', 'createdAt'])
export class BookingStatusHistoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    bookingId!: string

    @Column({ type: 'enum', enum: BookingStatus, enumName: 'booking_status' })
    status!: BookingStatus

    @Column({ type: 'uuid', nullable: true })
    changedById!: string | null

    @Column({ type: 'text', nullable: true })
    reason!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
