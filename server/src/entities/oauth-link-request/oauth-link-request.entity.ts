import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm'

import {
    OAuthIdentityProvider,
} from '../oauth-identity/oauth-identity.entity.js'
import { OAuthIdentityEntity } from '../oauth-identity/oauth-identity.entity.js'
import { UserEntity } from '../user/user.entity.js'

export enum OAuthLinkRequestPurpose {
    Link = 'link',
    Unlink = 'unlink',
}

@Entity('oauth_link_requests')
@Check('CHK_oauth_link_requests_state_hash', 'char_length("state_hash") = 64')
@Index('UQ_oauth_link_requests_state_hash', ['stateHash'], { unique: true })
@Index('IDX_oauth_link_requests_user_provider', ['userId', 'provider'])
export class OAuthLinkRequestEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text', name: 'state_hash' })
    stateHash!: string

    @Column({
        type: 'enum',
        enum: ['link', 'unlink'],
        enumName: 'oauth_link_request_purpose',
    })
    purpose!: OAuthLinkRequestPurpose

    @Column({
        type: 'enum',
        enum: OAuthIdentityProvider,
        enumName: 'oauth_identity_provider',
    })
    provider!: OAuthIdentityProvider

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @Column({ type: 'uuid', name: 'identity_id', nullable: true })
    identityId!: string | null

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity

    @ManyToOne(() => OAuthIdentityEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'identity_id' })
    identity!: OAuthIdentityEntity | null

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt!: Date

    @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
    consumedAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
