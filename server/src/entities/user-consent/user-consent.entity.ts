import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm'

export enum UserConsentType {
    Terms = 'terms',
    Privacy = 'privacy',
    Analytics = 'analytics',
    Marketing = 'marketing',
    ServiceRequest = 'service_request',
}

export enum UserConsentAction {
    Granted = 'granted',
    Revoked = 'revoked',
}

export enum UserConsentSource {
    Registration = 'registration',
    OAuthRegistration = 'oauth_registration',
    ServiceRequest = 'service_request',
    Profile = 'profile',
    Migration = 'migration',
}

@Entity('user_consent_records')
@Index('IDX_user_consent_records_user_type_created', ['userId', 'consentType', 'createdAt'])
@Index('IDX_user_consent_records_user_created', ['userId', 'createdAt'])
@Check(
    'CHK_user_consent_records_document_version',
    'char_length("documentVersion") BETWEEN 1 AND 80',
)
@Check(
    'CHK_user_consent_records_resource_id',
    '"resourceId" IS NULL OR "resourceId" ~* \'^[0-9a-f-]{36}$\'',
)
export class UserConsentEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'uuid', name: 'user_id' })
    userId!: string

    @Column({
        type: 'enum',
        enum: UserConsentType,
        enumName: 'user_consent_type',
        name: 'consent_type',
    })
    consentType!: UserConsentType

    @Column({
        type: 'enum',
        enum: UserConsentAction,
        enumName: 'user_consent_action',
    })
    action!: UserConsentAction

    @Column({ type: 'text', name: 'document_version' })
    documentVersion!: string

    @Column({
        type: 'enum',
        enum: UserConsentSource,
        enumName: 'user_consent_source',
    })
    source!: UserConsentSource

    @Column({ type: 'uuid', nullable: true, name: 'resource_id' })
    resourceId!: string | null

    /** A keyed digest keeps the evidence useful without storing the raw network identity. */
    @Column({ type: 'char', length: 64, nullable: true, name: 'ip_address_hash' })
    ipAddressHash!: string | null

    /** A keyed digest prevents the consent ledger from becoming a browser fingerprint store. */
    @Column({ type: 'char', length: 64, nullable: true, name: 'user_agent_hash' })
    userAgentHash!: string | null

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt!: Date
}
