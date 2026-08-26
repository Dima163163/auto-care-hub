import { BookingEntity } from './booking/booking.entity.js'
import { CabinetEntity } from './cabinet/cabinet.entity.js'
import { ReviewEntity } from './review/review.entity.js'
import { SecurityTokenEntity } from './security-token/security-token.entity.js'
import { ServiceEntity } from './service/service.entity.js'
import { UserEntity } from './user/user.entity.js'
import { ClientVehicleEntity } from './user/client-vehicle.entity.js'
import { UserSessionEntity } from './user-session/user-session.entity.js'
import { AuditLogEntity } from './audit-log/audit-log.entity.js'
import { NotificationEntity } from './notification/notification.entity.js'
import { BookingStatusHistoryEntity } from './booking/booking-status-history.entity.js'
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
import { SecurityMitigationEntity } from './security-mitigation/security-mitigation.entity.js'
import { CabinetImageManifestEntity } from './cabinet-image/cabinet-image-manifest.entity.js'
import {
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewPromoEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from './automotive/automotive.entity.js'
import {
    AutomotiveProviderMembershipEntity,
} from './automotive/provider-membership.entity.js'
import { AutomotiveProviderInvitationEntity } from './automotive/provider-invitation.entity.js'
import { AutoCareProviderDailyMetricEntity } from './automotive/provider-daily-metric.entity.js'
import { AutoCareCapacityResourceEntity, AutoCareCapacityReservationEntity } from './automotive/capacity-resource.entity.js'
import { AutomotiveProviderChangeRequestEntity } from './automotive/provider-change-request.entity.js'
import { AutomotiveCatalogGapRequestEntity } from './automotive/catalog-gap-request.entity.js'
import { AutomotiveProviderFavoriteEntity } from './automotive/provider-favorite.entity.js'
import { AutoCareBonusAccountEntity, AutoCareBonusLedgerEntity, AutoCareBonusProgramEntity } from './automotive/bonus.entity.js'
import { AutoCareChatBlockEntity, AutoCareChatReportEntity } from './automotive/chat-moderation.entity.js'
import { AutoCareAppealEntity } from './automotive/appeal.entity.js'
import {
    AutoCareChatThreadEntity,
    ServiceAttachmentEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
} from './automotive/service-request.entity.js'
import { AutoCareServiceQuoteEntity } from './automotive/service-quote.entity.js'
import { AutoCareRescheduleRequestEntity } from './automotive/autocare-reschedule-request.entity.js'
import { PlatformReviewEntity } from './platform-review/platform-review.entity.js'
import {
    AutoCareBroadcastOfferEntity,
    AutoCareBroadcastRequestEntity,
    AutoCareExpertQuestionEntity,
    AutoCareFleetAccountEntity,
    AutoCareFleetVehicleEntity,
    AutoCareGuaranteeClaimEntity,
    AutoCarePriceBenchmarkEntity,
    AutoCareRepairEventEntity,
    AutoCareTrustEvidenceEntity,
    AutoCareTrustSnapshotEntity,
} from './automotive/marketplace-enhancements.entity.js'

export const entities = [
    UserEntity,
    ClientVehicleEntity,
    CabinetEntity,
    ServiceEntity,
    BookingEntity,
    ReviewEntity,
    SecurityTokenEntity,
    UserSessionEntity,
    AuditLogEntity,
    NotificationEntity,
    BookingStatusHistoryEntity,
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
    SecurityMitigationEntity,
    CabinetImageManifestEntity,
    AutomotiveMarketCountryEntity,
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewPromoEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderInvitationEntity,
    AutoCareProviderDailyMetricEntity,
    AutoCareCapacityResourceEntity,
    AutoCareCapacityReservationEntity,
    AutomotiveProviderChangeRequestEntity,
    AutomotiveCatalogGapRequestEntity,
    AutomotiveProviderFavoriteEntity,
    AutoCareBonusProgramEntity,
    AutoCareBonusAccountEntity,
    AutoCareBonusLedgerEntity,
    AutoCareChatReportEntity,
    AutoCareChatBlockEntity,
    AutoCareAppealEntity,
    ServiceRequestEntity,
    AutoCareServiceQuoteEntity,
    AutoCareRescheduleRequestEntity,
    AutoCareChatThreadEntity,
    ServiceMessageEntity,
    ServiceAttachmentEntity,
    PlatformReviewEntity,
    AutoCarePriceBenchmarkEntity,
    AutoCareTrustEvidenceEntity,
    AutoCareTrustSnapshotEntity,
    AutoCareRepairEventEntity,
    AutoCareBroadcastRequestEntity,
    AutoCareBroadcastOfferEntity,
    AutoCareGuaranteeClaimEntity,
    AutoCareExpertQuestionEntity,
    AutoCareFleetAccountEntity,
    AutoCareFleetVehicleEntity,
]

export { BookingEntity } from './booking/booking.entity.js'
export { AutomotiveProviderFavoriteEntity } from './automotive/provider-favorite.entity.js'
export {
    AutoCareCapacityResourceEntity,
    AutoCareCapacityResourceType,
    AutoCareCapacityReservationEntity,
    AutoCareCapacityReservationStatus,
} from './automotive/capacity-resource.entity.js'
export {
    AutomotiveProviderChangeRequestEntity,
    AutomotiveProviderChangeRequestKind,
    AutomotiveProviderChangeRequestStatus,
} from './automotive/provider-change-request.entity.js'
export {
    AutomotiveCatalogGapRequestEntity,
    AutomotiveCatalogGapRequestStatus,
} from './automotive/catalog-gap-request.entity.js'
export { AutoCareBonusAccountEntity, AutoCareBonusLedgerEntity, AutoCareBonusProgramEntity, AutoCareBonusLedgerType } from './automotive/bonus.entity.js'
export {
    AutoCareChatBlockEntity,
    AutoCareChatBlockStatus,
    AutoCareChatReportCategory,
    AutoCareChatReportEntity,
    AutoCareChatReportStatus,
} from './automotive/chat-moderation.entity.js'
export { AutoCareAppealEntity, AutoCareAppealStatus, AutoCareAppealSubject } from './automotive/appeal.entity.js'
export { CabinetEntity } from './cabinet/cabinet.entity.js'
export { ReviewEntity } from './review/review.entity.js'
export { SecurityTokenEntity } from './security-token/security-token.entity.js'
export { ServiceEntity } from './service/service.entity.js'
export { UserEntity } from './user/user.entity.js'
export { ClientVehicleEntity } from './user/client-vehicle.entity.js'
export { UserSessionEntity } from './user-session/user-session.entity.js'
export { AuditLogEntity, AuditAction } from './audit-log/audit-log.entity.js'
export { NotificationEntity, NotificationCategory } from './notification/notification.entity.js'
export { BookingStatusHistoryEntity } from './booking/booking-status-history.entity.js'
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
    SecurityMitigationEntity,
    SecurityMitigationKind,
} from './security-mitigation/security-mitigation.entity.js'
export { CabinetImageManifestEntity } from './cabinet-image/cabinet-image-manifest.entity.js'
export {
    AutomotiveMarketCountryEntity,
    type AutomotiveMarketCapabilities,
    type AutomotiveMarketLegalLinks,
    AutomotiveMarketEntity,
    AutomotiveLocationZoneEntity,
    AutomotiveLocationZoneType,
    AutomotivePriceType,
    AutomotiveProviderEntity,
    AutomotiveProviderStatus,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    AutomotiveReviewPromoEntity,
    AutomotiveReviewPromoStatus,
    AutomotiveBookingMode,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
} from './automotive/automotive.entity.js'
export {
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
} from './automotive/provider-membership.entity.js'
export {
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderInvitationRole,
    AutomotiveProviderInvitationStatus,
} from './automotive/provider-invitation.entity.js'
export { AutoCareProviderDailyMetricEntity } from './automotive/provider-daily-metric.entity.js'
export {
    AutoCareChatThreadEntity,
    AutoCareChatThreadStatus,
    AutoCareChatThreadType,
    type AutomotiveOfferingSnapshot,
    type ServiceMessageOffer,
    ServiceAttachmentEntity,
    ServiceAttachmentStatus,
    ServiceMessageEntity,
    ServiceMessageKind,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from './automotive/service-request.entity.js'
export { AutoCareServiceQuoteEntity, AutoCareQuoteStatus } from './automotive/service-quote.entity.js'
export { AutoCareRescheduleRequestEntity, AutoCareRescheduleStatus } from './automotive/autocare-reschedule-request.entity.js'
export { PlatformReviewEntity, PlatformReviewStatus } from './platform-review/platform-review.entity.js'
export {
    AutoCareBroadcastOfferEntity,
    AutoCareBroadcastRequestEntity,
    AutoCareExpertQuestionEntity,
    AutoCareFleetAccountEntity,
    AutoCareFleetVehicleEntity,
    AutoCareGuaranteeClaimEntity,
    AutoCarePriceBenchmarkEntity,
    AutoCareRepairEventEntity,
    AutoCareTrustEvidenceEntity,
    AutoCareTrustSnapshotEntity,
} from './automotive/marketplace-enhancements.entity.js'
