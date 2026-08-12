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

@Entity('cabinet_schedules')
@Unique('UQ_cabinet_schedule_weekday', ['cabinetId', 'weekday'])
export class CabinetScheduleEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @Column({ type: 'smallint' })
    weekday!: number

    @Column({ type: 'time' })
    openTime!: string

    @Column({ type: 'time' })
    closeTime!: string

    @Column({ type: 'boolean', default: true })
    isOpen!: boolean
}
