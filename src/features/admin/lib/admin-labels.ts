import type { AuditLogAction, KnownAuditLogAction } from '../api/adminApi'
import type { TranslationKey } from '@/shared/lib/i18n'

type KnownAuditTargetType =
    | 'account_deletion_request'
    | 'cabinet'
    | 'oauth_identity'
    | 'outbox_event'
    | 'review'
    | 'security_center'
    | 'security_event'
    | 'security_events'
    | 'security_mitigation'
    | 'security_mitigations'
    | 'user'
    | 'user_sessions'

const auditTargetTypeTranslationKeys: Record<KnownAuditTargetType, TranslationKey> = {
    account_deletion_request: 'adminAuditLogs.targetTypes.account_deletion_request',
    cabinet: 'adminAuditLogs.targetTypes.cabinet',
    oauth_identity: 'adminAuditLogs.targetTypes.oauth_identity',
    outbox_event: 'adminAuditLogs.targetTypes.outbox_event',
    review: 'adminAuditLogs.targetTypes.review',
    security_center: 'adminAuditLogs.targetTypes.security_center',
    security_event: 'adminAuditLogs.targetTypes.security_event',
    security_events: 'adminAuditLogs.targetTypes.security_events',
    security_mitigation: 'adminAuditLogs.targetTypes.security_mitigation',
    security_mitigations: 'adminAuditLogs.targetTypes.security_mitigations',
    user: 'adminAuditLogs.targetTypes.user',
    user_sessions: 'adminAuditLogs.targetTypes.user_sessions',
}

const auditLogActionTranslationKeys: Record<KnownAuditLogAction, TranslationKey> = {
    admin_created: 'adminAuditLogs.actions.admin_created',
    cabinet_status_updated: 'adminAuditLogs.actions.cabinet_status_updated',
    promo_subscription_issued: 'adminAuditLogs.actions.promo_subscription_issued',
    review_deleted: 'adminAuditLogs.actions.review_deleted',
    review_moderated: 'adminAuditLogs.actions.review_moderated',
    subscription_created: 'adminAuditLogs.actions.subscription_created',
    user_role_updated: 'adminAuditLogs.actions.user_role_updated',
    user_status_updated: 'adminAuditLogs.actions.user_status_updated',
    login_failed: 'adminAuditLogs.actions.login_failed',
    account_locked: 'adminAuditLogs.actions.account_locked',
    refresh_token_reuse: 'adminAuditLogs.actions.refresh_token_reuse',
    outbox_retried: 'adminAuditLogs.actions.outbox_retried',
    outbox_dead_lettered: 'adminAuditLogs.actions.outbox_dead_lettered',
    oauth_identity_linked: 'adminAuditLogs.actions.oauth_identity_linked',
    oauth_identity_unlinked: 'adminAuditLogs.actions.oauth_identity_unlinked',
    account_deletion_requested: 'adminAuditLogs.actions.account_deletion_requested',
    account_deletion_cancelled: 'adminAuditLogs.actions.account_deletion_cancelled',
    account_deletion_completed: 'adminAuditLogs.actions.account_deletion_completed',
    security_events_viewed: 'adminAuditLogs.actions.security_events_viewed',
    security_center_report_exported: 'adminAuditLogs.actions.security_center_report_exported',
    security_mitigation_created: 'adminAuditLogs.actions.security_mitigation_created',
    security_mitigation_extended: 'adminAuditLogs.actions.security_mitigation_extended',
    security_mitigation_revoked: 'adminAuditLogs.actions.security_mitigation_revoked',
    security_user_sessions_revoked: 'adminAuditLogs.actions.security_user_sessions_revoked',
}

export function getAuditActionLabel(
    action: AuditLogAction,
    translate: (key: TranslationKey) => string,
) {
    const translationKey = auditLogActionTranslationKeys[action as KnownAuditLogAction]

    return translationKey ? translate(translationKey) : action
}

export function getAuditTargetTypeLabel(
    targetType: string | null | undefined,
    translate: (key: TranslationKey) => string,
) {
    if (!targetType) {
        return ''
    }

    const translationKey = auditTargetTypeTranslationKeys[targetType as KnownAuditTargetType]

    return translationKey ? translate(translationKey) : targetType
}
