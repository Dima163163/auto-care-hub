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

import { UserEntity, UserRole } from '../user/user.entity.js'

export enum SecurityEventType {
    LoginFailed = 'login_failed',
    AccountLocked = 'account_locked',
    RefreshTokenReuse = 'refresh_token_reuse',
    RateLimitExceeded = 'rate_limit_exceeded',
    InvalidToken = 'invalid_token',
    CsrfViolation = 'csrf_violation',
    RouteScan = 'route_scan',
    MalformedRequest = 'malformed_request',
    OversizedRequest = 'oversized_request',
    PrivilegeDenied = 'privilege_denied',
    WebhookAbuse = 'webhook_abuse',
    MutationBurst = 'mutation_burst',
}

export enum SecurityEventSeverity {
    Info = 'info',
    Warning = 'warning',
    High = 'high',
    Critical = 'critical',
}

export enum SecurityEventAuthOutcome {
    Unknown = 'unknown',
    Anonymous = 'anonymous',
    Authenticated = 'authenticated',
    Failed = 'failed',
}

export enum SecurityEventRateLimitResult {
    NotChecked = 'not_checked',
    Allowed = 'allowed',
    Blocked = 'blocked',
}

export enum SecurityEventProxyProvenance {
    Unknown = 'unknown',
    Direct = 'direct',
    TrustedProxy = 'trusted_proxy',
    ForwardedHeaderUntrusted = 'forwarded_header_untrusted',
}

@Entity('security_events')
@Index('IDX_security_events_user_created_at_id', ['userId', 'createdAt', 'id'])
@Index('IDX_security_events_type_created_at_id', ['type', 'createdAt', 'id'])
@Index('IDX_security_events_ip_created_at_id', ['ipAddress', 'createdAt', 'id'])
@Index('IDX_security_events_route_created_at_id', ['route', 'createdAt', 'id'])
@Index('IDX_security_events_severity_created_at_id', ['severity', 'createdAt', 'id'])
@Index('IDX_security_events_auth_outcome_created_at_id', ['authOutcome', 'createdAt', 'id'])
@Index('IDX_security_events_rate_limit_created_at_id', ['rateLimitResult', 'createdAt', 'id'])
@Check(
    'CHK_security_events_failed_attempts',
    '"failed_login_attempts" IS NULL OR "failed_login_attempts" >= 1',
)
@Check(
    'CHK_security_events_severity',
    '"severity" IN (\'info\', \'warning\', \'high\', \'critical\')',
)
@Check(
    'CHK_security_events_status_code',
    '"status_code" IS NULL OR "status_code" BETWEEN 100 AND 599',
)
@Check(
    'CHK_security_events_actor_role',
    '"actor_role" IS NULL OR "actor_role" IN (\'client\', \'owner\', \'admin\', \'super_admin\')',
)
@Check(
    'CHK_security_events_request_size',
    '"request_size_bytes" IS NULL OR "request_size_bytes" BETWEEN 0 AND 50000000',
)
@Check(
    'CHK_security_events_auth_outcome',
    '"auth_outcome" IN (\'unknown\', \'anonymous\', \'authenticated\', \'failed\')',
)
@Check(
    'CHK_security_events_rate_limit_result',
    '"rate_limit_result" IN (\'not_checked\', \'allowed\', \'blocked\')',
)
@Check(
    'CHK_security_events_proxy_provenance',
    '"proxy_provenance" IN (\'unknown\', \'direct\', \'trusted_proxy\', \'forwarded_header_untrusted\')',
)
export class SecurityEventEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId!: string | null

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user!: UserEntity | null

    @Column({ type: 'text' })
    type!: SecurityEventType

    @Column({ type: 'text', default: SecurityEventSeverity.Warning })
    severity!: SecurityEventSeverity

    @Column({ name: 'failed_login_attempts', type: 'integer', nullable: true })
    failedLoginAttempts!: number | null

    @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
    lockedUntil!: Date | null

    @Column({ name: 'ip_address', type: 'text', nullable: true })
    ipAddress!: string | null

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent!: string | null

    @Column({ name: 'correlation_id', type: 'text', nullable: true })
    correlationId!: string | null

    @Column({ type: 'text', nullable: true })
    method!: string | null

    @Column({ type: 'text', nullable: true })
    route!: string | null

    @Column({ name: 'status_code', type: 'integer', nullable: true })
    statusCode!: number | null

    @Column({ name: 'actor_role', type: 'text', nullable: true })
    actorRole!: UserRole | null

    @Column({ name: 'auth_outcome', type: 'text', default: SecurityEventAuthOutcome.Unknown })
    authOutcome!: SecurityEventAuthOutcome

    @Column({ name: 'rate_limit_result', type: 'text', default: SecurityEventRateLimitResult.NotChecked })
    rateLimitResult!: SecurityEventRateLimitResult

    @Column({ name: 'request_size_bytes', type: 'integer', nullable: true })
    requestSizeBytes!: number | null

    @Column({ name: 'reason_code', type: 'text', nullable: true })
    reasonCode!: string | null

    @Column({ name: 'proxy_provenance', type: 'text', default: SecurityEventProxyProvenance.Unknown })
    proxyProvenance!: SecurityEventProxyProvenance

    @Column({ name: 'request_id', type: 'text', nullable: true })
    requestId!: string | null

    @Column({ type: 'jsonb', default: {} })
    metadata!: Record<string, unknown>

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date
}
