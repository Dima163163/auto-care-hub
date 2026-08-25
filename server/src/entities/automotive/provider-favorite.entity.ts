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
import { AutomotiveProviderEntity, AutomotiveServiceLocationEntity } from './automotive.entity.js'

@Entity('autocare_provider_favorites')
@Index(['userId', 'providerId'], { unique: true })
@Index(['userId', 'createdAt'])
export class AutomotiveProviderFavoriteEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: Relation<UserEntity>

    @Column({ type: 'uuid' })
    providerId!: string

    @ManyToOne(() => AutomotiveProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'providerId' })
    provider!: Relation<AutomotiveProviderEntity>

    @Column({ type: 'uuid' })
    locationId!: string

    @ManyToOne(() => AutomotiveServiceLocationEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'locationId' })
    location!: Relation<AutomotiveServiceLocationEntity>

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
