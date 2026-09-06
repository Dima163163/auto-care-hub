import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Index,
} from 'typeorm'

import { UserEntity } from '../user/user.entity.js'

export enum AuditAction {
    UserStatusUpdated = 'user_status_updated',
    UserRoleUpdated = 'user_role_updated',
    AdminCreated = 'admin_created',
    CabinetStatusUpdated = 'cabinet_status_updated',
    AutoCareProviderStatusUpdated = 'autocare_provider_status_updated',
    AutoCareProviderChangeRequestDecided = 'autocare_provider_change_request_decided',
    AutoCareCatalogGapRequestDecided = 'autocare_catalog_gap_request_decided',
    AutoCareMarketUpdated = 'autocare_market_updated',
    AutoCareMarketCountryCreated = 'autocare_market_country_created',
    AutoCareMarketCountryUpdated = 'autocare_market_country_updated',
    AutoCareMarketCreated = 'autocare_market_created',
    AutoCareMarketZoneCreated = 'autocare_market_zone_created',
    AutoCareMarketZoneUpdated = 'autocare_market_zone_updated',
    AutoCareMarketCountryDeleted = 'autocare_market_country_deleted',
    AutoCareMarketDeleted = 'autocare_market_deleted',
    AutoCareMarketZoneDeleted = 'autocare_market_zone_deleted',
    AutoCareTrustPolicyUpdated = 'autocare_trust_policy_updated',
    AutoCareServiceDefinitionUpdated = 'autocare_service_definition_updated',
    AutoCareBonusGranted = 'autocare_bonus_granted',
    AutoCareReviewDiscountIssued = 'autocare_review_discount_issued',
    AutoCareOfferPriceUpdated = 'autocare_offer_price_updated',
    AutoCareCommunicationSettingsUpdated = 'autocare_communication_settings_updated',
    AutoCareMembershipChanged = 'autocare_membership_changed',
    AutoCareMembershipViewed = 'autocare_membership_viewed',
    AutoCarePhoneContactViewed = 'autocare_phone_contact_viewed',
    AutoCareEvidenceViewed = 'autocare_evidence_viewed',
    AutoCareMediaUploaded = 'autocare_media_uploaded',
    AutoCareAppealsViewed = 'autocare_appeals_viewed',
    AutoCareModerationQueueViewed = 'autocare_moderation_queue_viewed',
    AutoCareProviderChangesViewed = 'autocare_provider_changes_viewed',
    AutoCareCatalogGapsViewed = 'autocare_catalog_gaps_viewed',
    AutoCareChatReportsViewed = 'autocare_chat_reports_viewed',
    PlatformReviewsViewed = 'platform_reviews_viewed',
    AutoCareAppealDecided = 'autocare_appeal_decided',
    AutoCareModerationEvidenceDecided = 'autocare_moderation_evidence_decided',
    ChatReportModerated = 'chat_report_moderated',
    ReviewModerated = 'review_moderated',
    ReviewDeleted = 'review_deleted',
    LoginFailed = 'login_failed',
    AccountLocked = 'account_locked',
    RefreshTokenReuse = 'refresh_token_reuse',
    OutboxRetried = 'outbox_retried',
    OutboxDeadLettered = 'outbox_dead_lettered',
    SystemIncidentStatusUpdated = 'system_incident_status_updated',
    OAuthIdentityLinked = 'oauth_identity_linked',
    OAuthIdentityUnlinked = 'oauth_identity_unlinked',
    UserDataExported = 'user_data_exported',
    AccountDeletionRequested = 'account_deletion_requested',
    AccountDeletionCancelled = 'account_deletion_cancelled',
    AccountDeletionCompleted = 'account_deletion_completed',
    SecurityEventsViewed = 'security_events_viewed',
    SecurityCenterViewed = 'security_center_viewed',
    SecurityCenterEventStatusUpdated = 'security_center_event_status_updated',
    SecurityCenterReportExported = 'security_center_report_exported',
    SecurityMitigationsViewed = 'security_mitigations_viewed',
    SecurityMitigationCreated = 'security_mitigation_created',
    SecurityMitigationExtended = 'security_mitigation_extended',
    SecurityMitigationRevoked = 'security_mitigation_revoked',
    SecurityUserSessionsRevoked = 'security_user_sessions_revoked',
}

@Entity('audit_logs')
@Index('IDX_audit_logs_created_at', ['createdAt'])
@Index('IDX_audit_logs_created_at_id', ['createdAt', 'id'])
@Index('IDX_audit_logs_action_created_at', ['action', 'createdAt', 'id'])
@Index('IDX_audit_logs_target_type_created_at', ['targetType', 'createdAt', 'id'])
@Index('IDX_audit_logs_actor_created_at', ['actorId', 'createdAt', 'id'])
export class AuditLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'actor_id', type: 'uuid', nullable: true })
    actorId!: string | null

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'actor_id' })
    actor!: UserEntity | null

    @Column({ type: 'text' })
    action!: string

    @Column({ name: 'target_id', type: 'text', nullable: true })
    targetId!: string | null

    @Column({ name: 'target_type', type: 'text', nullable: true })
    targetType!: string | null

    @Column({ type: 'jsonb', default: {} })
    metadata!: Record<string, unknown>

    @Column({ name: 'ip_address', type: 'text', nullable: true })
    ipAddress!: string | null

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent!: string | null

    @Column({ name: 'correlation_id', type: 'text', nullable: true })
    correlationId!: string | null

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
