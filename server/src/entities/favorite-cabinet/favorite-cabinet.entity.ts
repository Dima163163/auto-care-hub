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

import { CabinetEntity } from '../cabinet/cabinet.entity.js'
import { UserEntity } from '../user/user.entity.js'

@Entity('favorite_cabinets')
@Index(['userId', 'cabinetId'], { unique: true })
@Index(['userId', 'createdAt'])
export class FavoriteCabinetEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: Relation<UserEntity>

    @Column({ type: 'uuid' })
    cabinetId!: string

    @ManyToOne(() => CabinetEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cabinetId' })
    cabinet!: Relation<CabinetEntity>

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
