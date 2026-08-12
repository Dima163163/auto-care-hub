import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    type Relation,
} from 'typeorm'

import { BookingEntity } from '../booking/booking.entity.js'
import { CabinetEntity } from '../cabinet/cabinet.entity.js'
import { UserEntity } from '../user/user.entity.js'

export enum ReviewStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
}

@Entity('reviews')
@Check(
    'CHK_reviews_input_bounds',
    '"rating" BETWEEN 1 AND 5 AND char_length("text") BETWEEN 10 AND 1000',
)
export class ReviewEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @Column({ type: 'uuid' })
    clientId!: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'clientId' })
    client!: Relation<UserEntity>

    @Column({ type: 'uuid' })
    bookingId!: string

    @ManyToOne(() => BookingEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'bookingId' })
    booking!: Relation<BookingEntity>

    @Column({ type: 'integer' })
    rating!: number

    @Column({ type: 'text' })
    text!: string

    @Column({
        type: 'enum',
        enum: ReviewStatus,
        enumName: 'review_status',
        default: ReviewStatus.Pending,
    })
    status!: ReviewStatus

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date
}
