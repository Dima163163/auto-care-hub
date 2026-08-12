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

import { CabinetEntity } from '../cabinet/cabinet.entity.js'

@Entity('services')
@Index('IDX_services_cabinet_active', ['cabinetId', 'isActive'])
@Check(
    'CHK_services_input_bounds',
    'char_length("title") BETWEEN 2 AND 160 AND ("description" IS NULL OR char_length("description") <= 500) AND "durationMinutes" BETWEEN 1 AND 1440 AND "price" BETWEEN 1 AND 1000000',
)
export class ServiceEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @Column({ type: 'text' })
    title!: string

    @Column({ type: 'text', nullable: true })
    description!: string | null

    @Column({ type: 'integer' })
    durationMinutes!: number

    @Column({ type: 'integer' })
    price!: number

    @Column({ type: 'boolean', default: true })
    isActive!: boolean
}
