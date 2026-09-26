import {
    Column,
    Check,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm'
import { createEncryptedFieldTransformer } from '../../shared/security/data-encryption/field-encryption.js'

import { CabinetEntity } from '../cabinet/cabinet.entity.js'
import { ServiceEntity } from '../service/service.entity.js'
import { UserEntity } from '../user/user.entity.js'

export enum BookingStatus {
    Pending = 'pending',
    Confirmed = 'confirmed',
    Cancelled = 'cancelled',
    Completed = 'completed',
}

@Entity('bookings')
@Index('IDX_bookings_cabinet_date_status', ['cabinetId', 'date', 'status'])
@Index('IDX_bookings_client_schedule', ['clientId', 'date', 'startTime', 'id'])
@Index('IDX_bookings_client_idempotency_key', ['clientId', 'idempotencyKey'], { unique: true })
@Check('CHK_bookings_time_range', '"startTime" < "endTime"')
export class BookingEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    clientId!: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'clientId' })
    client!: Relation<UserEntity>

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @Column({ type: 'uuid' })
    serviceId!: string

    @ManyToOne(() => ServiceEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'serviceId' })
    service!: Relation<ServiceEntity>

    @Column({ type: 'date' })
    date!: string

    @Column({ type: 'time' })
    startTime!: string

    @Column({ type: 'time' })
    endTime!: string

    @Column({
        type: 'enum',
        enum: BookingStatus,
        enumName: 'booking_status',
        default: BookingStatus.Pending,
    })
    status!: BookingStatus

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('bookings', 'comment', 'text') })
    comment!: string | null

    @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
    idempotencyKey!: string | null

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('bookings', 'cancellationReason', 'text') })
    cancellationReason!: string | null

    @Column({ type: 'text', nullable: true, transformer: createEncryptedFieldTransformer('bookings', 'ownerNote', 'text') })
    ownerNote!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
