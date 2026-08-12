import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

export enum OAuthIdentityProvider {
    Google = 'google',
    Yandex = 'yandex',
}

@Entity('oauth_identities')
@Check(
    'CHK_oauth_identities_input_bounds',
    'char_length("provider_subject") BETWEEN 1 AND 255',
)
@Unique('UQ_oauth_identities_provider_subject', [
    'provider',
    'providerSubject',
])
@Index('IDX_oauth_identities_user_id', ['userId'])
export class OAuthIdentityEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({
        type: 'enum',
        enum: OAuthIdentityProvider,
        enumName: 'oauth_identity_provider',
    })
    provider!: OAuthIdentityProvider

    @Column({ type: 'text', name: 'provider_subject' })
    providerSubject!: string

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
