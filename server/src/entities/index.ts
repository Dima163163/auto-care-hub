import { BookingEntity } from './booking/booking.entity.js'
import { CabinetEntity } from './cabinet/cabinet.entity.js'
import { ReviewEntity } from './review/review.entity.js'
import { SecurityTokenEntity } from './security-token/security-token.entity.js'
import { ServiceEntity } from './service/service.entity.js'
import { UserEntity } from './user/user.entity.js'
import { UserSessionEntity } from './user-session/user-session.entity.js'
import { AuditLogEntity } from './audit-log/audit-log.entity.js'
import { NotificationEntity } from './notification/notification.entity.js'
import { BookingStatusHistoryEntity } from './booking/booking-status-history.entity.js'
import { BookingPaymentEntity } from './booking/booking-payment.entity.js'
import { BookingPaymentAttemptEntity } from './booking/booking-payment-attempt.entity.js'
import { StripeWebhookEventEntity } from './booking/stripe-webhook-event.entity.js'
import { CabinetScheduleEntity } from './cabinet/cabinet-schedule.entity.js'
import { CabinetScheduleExceptionEntity } from './cabinet/cabinet-schedule-exception.entity.js'
import { BookingRescheduleRequestEntity } from './booking/booking-reschedule-request.entity.js'
import { OutboxEventEntity } from './outbox/outbox-event.entity.js'
import { CabinetBlockedPeriodEntity } from './cabinet/cabinet-blocked-period.entity.js'
import { SystemIncidentEntity } from './system-incident/system-incident.entity.js'
import { FavoriteCabinetEntity } from './favorite-cabinet/favorite-cabinet.entity.js'
import { OAuthIdentityEntity } from './oauth-identity/oauth-identity.entity.js'
import { OAuthLinkRequestEntity } from './oauth-link-request/oauth-link-request.entity.js'
import { AccountDeletionRequestEntity } from './account-deletion-request/account-deletion-request.entity.js'
import { SecurityEventEntity } from './security-event/security-event.entity.js'
import { SecurityEventActionEntity } from './security-event/security-event-action.entity.js'
import { BookingPaymentInvoiceEntity } from './booking/booking-payment-invoice.entity.js'
import { BookingPaymentRefundEntity } from './booking/booking-payment-refund.entity.js'
import { BookingPaymentDisputeEntity } from './booking/booking-payment-dispute.entity.js'
import { SecurityMitigationEntity } from './security-mitigation/security-mitigation.entity.js'
import { CabinetImageManifestEntity } from './cabinet-image/cabinet-image-manifest.entity.js'
import {
    AutomotiveMarketEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from './automotive/automotive.entity.js'
import {
    ServiceAttachmentEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from './automotive/service-request.entity.js'

export const entities = [
    UserEntity,
    CabinetEntity,
    ServiceEntity,
    BookingEntity,
    ReviewEntity,
    SecurityTokenEntity,
    UserSessionEntity,
    AuditLogEntity,
    NotificationEntity,
    BookingStatusHistoryEntity,
    BookingPaymentEntity,
    BookingPaymentAttemptEntity,
    StripeWebhookEventEntity,
    CabinetScheduleEntity,
    CabinetScheduleExceptionEntity,
    BookingRescheduleRequestEntity,
    OutboxEventEntity,
    CabinetBlockedPeriodEntity,
    SystemIncidentEntity,
    FavoriteCabinetEntity,
    OAuthIdentityEntity,
    OAuthLinkRequestEntity,
    AccountDeletionRequestEntity,
    SecurityEventEntity,
    SecurityEventActionEntity,
    BookingPaymentInvoiceEntity,
    BookingPaymentRefundEntity,
    BookingPaymentDisputeEntity,
    SecurityMitigationEntity,
    CabinetImageManifestEntity,
    AutomotiveMarketEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceRequestEntity,
    ServiceMessageEntity,
    ServiceAttachmentEntity,
]

export { BookingEntity } from './booking/booking.entity.js'
export { CabinetEntity } from './cabinet/cabinet.entity.js'
export { ReviewEntity } from './review/review.entity.js'
export { SecurityTokenEntity } from './security-token/security-token.entity.js'
export { ServiceEntity } from './service/service.entity.js'
export { UserEntity } from './user/user.entity.js'
export { UserSessionEntity } from './user-session/user-session.entity.js'
export { AuditLogEntity, AuditAction } from './audit-log/audit-log.entity.js'
export { NotificationEntity, NotificationCategory } from './notification/notification.entity.js'
export { BookingStatusHistoryEntity } from './booking/booking-status-history.entity.js'
export { BookingPaymentEntity, BookingPaymentStatus } from './booking/booking-payment.entity.js'
export {
    BookingPaymentAttemptEntity,
    BookingPaymentAttemptStatus,
} from './booking/booking-payment-attempt.entity.js'
export {
    StripeWebhookEventEntity,
    StripeWebhookEventStatus,
} from './booking/stripe-webhook-event.entity.js'
export { CabinetScheduleEntity } from './cabinet/cabinet-schedule.entity.js'
export { CabinetScheduleExceptionEntity } from './cabinet/cabinet-schedule-exception.entity.js'
export { BookingRescheduleRequestEntity, BookingRescheduleStatus } from './booking/booking-reschedule-request.entity.js'
export { OutboxEventEntity, OutboxEventStatus } from './outbox/outbox-event.entity.js'
export { CabinetBlockedPeriodEntity, CabinetBlockedPeriodKind } from './cabinet/cabinet-blocked-period.entity.js'
export {
    SystemIncidentEntity,
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from './system-incident/system-incident.entity.js'
export { FavoriteCabinetEntity } from './favorite-cabinet/favorite-cabinet.entity.js'
export {
    OAuthIdentityEntity,
    OAuthIdentityProvider,
} from './oauth-identity/oauth-identity.entity.js'
export {
    OAuthLinkRequestEntity,
    OAuthLinkRequestPurpose,
} from './oauth-link-request/oauth-link-request.entity.js'
export {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from './account-deletion-request/account-deletion-request.entity.js'
export {
    SecurityEventEntity,
    SecurityEventAuthOutcome,
    SecurityEventProxyProvenance,
    SecurityEventRateLimitResult,
    SecurityEventSeverity,
    SecurityEventType,
} from './security-event/security-event.entity.js'
export {
    SecurityEventActionEntity,
    SecurityEventActionStatus,
} from './security-event/security-event-action.entity.js'
export {
    BookingPaymentInvoiceEntity,
    BookingPaymentInvoiceStatus,
} from './booking/booking-payment-invoice.entity.js'
export {
    BookingPaymentRefundEntity,
    BookingPaymentRefundStatus,
} from './booking/booking-payment-refund.entity.js'
export {
    BookingPaymentDisputeEntity,
    BookingPaymentDisputeStatus,
} from './booking/booking-payment-dispute.entity.js'
export {
    SecurityMitigationEntity,
    SecurityMitigationKind,
} from './security-mitigation/security-mitigation.entity.js'
export { CabinetImageManifestEntity } from './cabinet-image/cabinet-image-manifest.entity.js'
export {
    AutomotiveMarketEntity,
    AutomotivePriceType,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from './automotive/automotive.entity.js'
export {
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceMessageKind,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from './automotive/service-request.entity.js'
