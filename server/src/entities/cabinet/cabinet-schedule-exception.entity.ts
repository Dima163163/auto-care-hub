import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    type Relation,
} from 'typeorm'

import { CabinetEntity } from './cabinet.entity.js'

@Entity('cabinet_schedule_exceptions')
@Unique('UQ_cabinet_schedule_exception_date', ['cabinetId', 'date'])
export class CabinetScheduleExceptionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @Column({ type: 'date' })
    date!: string

    @Column({ type: 'time', nullable: true })
    openTime!: string | null

    @Column({ type: 'time', nullable: true })
    closeTime!: string | null

    @Column({ type: 'boolean', default: false })
    isClosed!: boolean
}
