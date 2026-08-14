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
    ReviewModerated = 'review_moderated',
    ReviewDeleted = 'review_deleted',
    SubscriptionCreated = 'subscription_created',
    PaymentSucceeded = 'payment_succeeded',
    PaymentFailed = 'payment_failed',
    PaymentPartiallyRefunded = 'payment_partially_refunded',
    PaymentRefunded = 'payment_refunded',
    LoginFailed = 'login_failed',
    AccountLocked = 'account_locked',
    RefreshTokenReuse = 'refresh_token_reuse',
    OutboxRetried = 'outbox_retried',
    OutboxDeadLettered = 'outbox_dead_lettered',
    PromoSubscriptionIssued = 'promo_subscription_issued',
    OAuthIdentityLinked = 'oauth_identity_linked',
    OAuthIdentityUnlinked = 'oauth_identity_unlinked',
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
