import {
    Check,
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

export enum CabinetStatus {
    Draft = 'draft',
    Active = 'active',
    Blocked = 'blocked',
}

@Entity('cabinets')
@Index('IDX_cabinets_owner_created_at', ['ownerId', 'createdAt', 'id'])
@Check(
    'CHK_cabinets_input_bounds',
    'char_length("title") BETWEEN 2 AND 160 AND char_length("description") BETWEEN 10 AND 5000 AND char_length("address") BETWEEN 2 AND 240 AND char_length("city") BETWEEN 2 AND 120 AND char_length("timezone") BETWEEN 1 AND 80 AND "pricePerHour" BETWEEN 1 AND 1000000 AND cardinality("photos") <= 20 AND cardinality("amenities") <= 20 AND ("cancellationPolicy" IS NULL OR char_length("cancellationPolicy") <= 2000) AND ("houseRules" IS NULL OR char_length("houseRules") <= 2000)',
)
export class CabinetEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    ownerId!: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'ownerId' })
    owner!: Relation<UserEntity>

    @Column({ type: 'text' })
    title!: string

    @Column({ type: 'text' })
    description!: string

    @Column({ type: 'text' })
    address!: string

    @Column({ type: 'text' })
    city!: string

    @Column({ type: 'text', default: 'UTC' })
    timezone!: string

    @Column({ type: 'integer' })
    pricePerHour!: number

    @Column({
        type: 'enum',
        enum: CabinetStatus,
        enumName: 'cabinet_status',
        default: CabinetStatus.Draft,
    })
    status!: CabinetStatus

    @Column('text', {
        array: true,
        default: () => "'{}'",
    })
    photos!: string[]

    @Column('text', { array: true, default: () => "'{}'" })
    amenities!: string[]

    @Column({ type: 'text', nullable: true })
    cancellationPolicy!: string | null

    @Column({ type: 'text', nullable: true })
    houseRules!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
