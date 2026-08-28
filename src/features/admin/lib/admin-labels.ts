import type { AuditLogAction, KnownAuditLogAction } from '../api/adminApi'
import type { TranslationKey } from '@/shared/lib/i18n'

type KnownAuditTargetType =
    | 'account_deletion_request'
    | 'cabinet'
    | 'autocare_appeal'
    | 'autocare_catalog_gap_request'
    | 'autocare_chat_report'
    | 'autocare_moderation_evidence'
    | 'autocare_provider'
    | 'autocare_provider_change_request'
    | 'autocare_market'
    | 'autocare_market_country'
    | 'autocare_market_zone'
    | 'autocare_location_zone'
    | 'autocare_service_definition'
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
    autocare_appeal: 'adminAuditLogs.targetTypes.autocare_appeal',
    autocare_catalog_gap_request: 'adminAuditLogs.targetTypes.autocare_catalog_gap_request',
    autocare_chat_report: 'adminAuditLogs.targetTypes.autocare_chat_report',
    autocare_moderation_evidence: 'adminAuditLogs.targetTypes.autocare_moderation_evidence',
    autocare_provider: 'adminAuditLogs.targetTypes.autocare_provider',
    autocare_provider_change_request: 'adminAuditLogs.targetTypes.autocare_provider_change_request',
    autocare_market: 'adminAuditLogs.targetTypes.autocare_market',
    autocare_market_country: 'adminAuditLogs.targetTypes.autocare_market_country',
    autocare_market_zone: 'adminAuditLogs.targetTypes.autocare_market_zone',
    autocare_location_zone: 'adminAuditLogs.targetTypes.autocare_location_zone',
    autocare_service_definition: 'adminAuditLogs.targetTypes.autocare_service_definition',
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
    autocare_provider_status_updated: 'adminAuditLogs.actions.autocare_provider_status_updated',
    autocare_provider_change_request_decided: 'adminAuditLogs.actions.autocare_provider_change_request_decided',
    autocare_catalog_gap_request_decided: 'adminAuditLogs.actions.autocare_catalog_gap_request_decided',
    autocare_market_updated: 'adminAuditLogs.actions.autocare_market_updated',
    autocare_market_country_created: 'adminAuditLogs.actions.autocare_market_country_created',
    autocare_market_country_updated: 'adminAuditLogs.actions.autocare_market_country_updated',
    autocare_market_created: 'adminAuditLogs.actions.autocare_market_created',
    autocare_market_zone_created: 'adminAuditLogs.actions.autocare_market_zone_created',
    autocare_market_zone_updated: 'adminAuditLogs.actions.autocare_market_zone_updated',
    autocare_service_definition_updated: 'adminAuditLogs.actions.autocare_service_definition_updated',
    autocare_bonus_granted: 'adminAuditLogs.actions.autocare_bonus_granted',
    autocare_appeal_decided: 'adminAuditLogs.actions.autocare_appeal_decided',
    autocare_moderation_evidence_decided: 'adminAuditLogs.actions.autocare_moderation_evidence_decided',
    chat_report_moderated: 'adminAuditLogs.actions.chat_report_moderated',
    system_incident_status_updated: 'adminAuditLogs.actions.system_incident_status_updated',
    review_deleted: 'adminAuditLogs.actions.review_deleted',
    review_moderated: 'adminAuditLogs.actions.review_moderated',
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
