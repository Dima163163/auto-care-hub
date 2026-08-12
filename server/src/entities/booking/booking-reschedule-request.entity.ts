import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'
import { BookingEntity } from './booking.entity.js'

export enum BookingRescheduleStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Rejected = 'rejected',
}

@Entity('booking_reschedule_requests')
@Index('UQ_booking_reschedule_pending', ['bookingId'], {
    unique: true,
    where: '"status" = \'pending\'',
})
export class BookingRescheduleRequestEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    bookingId!: string

    @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bookingId' })
    booking!: Relation<BookingEntity>

    @Column({ type: 'uuid' })
    requestedById!: string

    @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'requestedById' })
    requestedBy!: Relation<UserEntity>

    @Column({ type: 'date' })
    proposedDate!: string

    @Column({ type: 'time' })
    proposedStartTime!: string

    @Column({ type: 'time' })
    proposedEndTime!: string

    @Column({
        type: 'enum',
        enum: BookingRescheduleStatus,
        enumName: 'booking_reschedule_status',
        default: BookingRescheduleStatus.Pending,
    })
    status!: BookingRescheduleStatus

    @Column({ type: 'uuid', nullable: true })
    resolvedById!: string | null

    @Column({ type: 'text', nullable: true })
    resolutionReason!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date

    @Column({ type: 'timestamptz', nullable: true })
    resolvedAt!: Date | null
}
