import {
    Check,
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm'

import { CabinetEntity } from './cabinet.entity.js'

export enum CabinetBlockedPeriodKind {
    Blocked = 'blocked',
    Holiday = 'holiday',
}

@Entity('cabinet_blocked_periods')
@Index('IDX_cabinet_blocked_period_date', ['cabinetId', 'date'])
@Check(
    'CHK_cabinet_blocked_period_time_range',
    '("startTime" IS NULL AND "endTime" IS NULL) OR ("startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" < "endTime")',
)
export class CabinetBlockedPeriodEntity {
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
    startTime!: string | null

    @Column({ type: 'time', nullable: true })
    endTime!: string | null

    @Column({
        type: 'enum',
        enum: CabinetBlockedPeriodKind,
        enumName: 'cabinet_blocked_period_kind',
        default: CabinetBlockedPeriodKind.Blocked,
    })
    kind!: CabinetBlockedPeriodKind

    @Column({ type: 'text', nullable: true })
    reason!: string | null
}
