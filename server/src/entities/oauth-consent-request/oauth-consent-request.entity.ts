import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

import { OAuthIdentityProvider } from '../oauth-identity/oauth-identity.entity.js'

@Entity('oauth_consent_requests')
@Index('UQ_oauth_consent_requests_state_hash', ['stateHash'], { unique: true })
@Index('IDX_oauth_consent_requests_expires_at', ['expiresAt'])
export class OAuthConsentRequestEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'text', name: 'state_hash' })
    stateHash!: string

    @Column({
        type: 'enum',
        enum: OAuthIdentityProvider,
        enumName: 'oauth_identity_provider',
    })
    provider!: OAuthIdentityProvider

    @Column({ type: 'text', name: 'terms_version' })
    termsVersion!: string

    @Column({ type: 'text', name: 'privacy_version' })
    privacyVersion!: string

    @Column({ type: 'char', length: 64, nullable: true, name: 'ip_address_hash' })
    ipAddressHash!: string | null

    @Column({ type: 'char', length: 64, nullable: true, name: 'user_agent_hash' })
    userAgentHash!: string | null

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt!: Date

    @Column({ type: 'timestamptz', nullable: true, name: 'consumed_at' })
    consumedAt!: Date | null

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
