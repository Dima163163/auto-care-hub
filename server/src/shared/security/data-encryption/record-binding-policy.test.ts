import { describe, expect, it } from 'vitest'
import { requireAcceptedQuoteRecordBinding, requireEstimateSnapshotRecordBinding, requireContactSnapshotRecordBinding, requireVehicleSnapshotRecordBinding, requireServiceRequestNoteRecordBinding, requireServiceRequestOutcomeRecordBinding, requireClientVehicleRecordBinding, requireUserSecondaryRecordBinding, requireBookingStatusReasonRecordBinding, requireBookingTextRecordBinding, requireBookingRescheduleReasonRecordBinding, requireAutoCareRescheduleTextRecordBinding, requireServiceQuoteSnapshotRecordBinding, requireChatReportTextRecordBinding, requireChatBlockReasonRecordBinding, requireTrustEvidenceRecordBinding, requireProviderChangeRequestRecordBinding, requireAppealRecordBinding, requireCatalogGapRecordBinding, requireRepairEventRecordBinding, requireBroadcastRequestRecordBinding, requireBookingSnapshotRecordBinding, requireChatSubjectRecordBinding, requireEmailRecordBinding, requireMessageBodyRecordBinding, requireMessageOfferRecordBinding, requireOAuthRecordBinding, requireOutboxRecordBinding, requireUserProfileRecordBinding } from './record-binding-policy.js'

describe('email record binding cutover policy', () => {
    it('defaults to compatibility and accepts only explicit boolean values', () => {
        expect(requireEmailRecordBinding({})).toBe(false)
        expect(requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING must be true or false.')
    })
})

describe('outbox record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireOutboxRecordBinding({})).toBe(false)
        expect(requireOutboxRecordBinding({ DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireOutboxRecordBinding({ DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireOutboxRecordBinding({ DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING must be true or false.')
    })
})

describe('OAuth record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireOAuthRecordBinding({})).toBe(false)
        expect(requireOAuthRecordBinding({ DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireOAuthRecordBinding({ DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireOAuthRecordBinding({ DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING must be true or false.')
    })
})

describe('user profile record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireUserProfileRecordBinding({})).toBe(false)
        expect(requireUserProfileRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireUserProfileRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireUserProfileRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING must be true or false.')
    })
})

describe('user secondary record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireUserSecondaryRecordBinding({})).toBe(false)
        expect(requireUserSecondaryRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireUserSecondaryRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireUserSecondaryRecordBinding({ DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING must be true or false.')
    })
})

describe('message body record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireMessageBodyRecordBinding({})).toBe(false)
        expect(requireMessageBodyRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireMessageBodyRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireMessageBodyRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING must be true or false.')
    })
})

describe('message offer record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireMessageOfferRecordBinding({})).toBe(false)
        expect(requireMessageOfferRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireMessageOfferRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireMessageOfferRecordBinding({ DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING must be true or false.')
    })
})

describe('chat subject record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireChatSubjectRecordBinding({})).toBe(false)
        expect(requireChatSubjectRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireChatSubjectRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireChatSubjectRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING must be true or false.')
    })
})

describe('booking snapshot record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireBookingSnapshotRecordBinding({})).toBe(false)
        expect(requireBookingSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireBookingSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireBookingSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING must be true or false.')
    })
})

describe('accepted quote record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireAcceptedQuoteRecordBinding({})).toBe(false)
        expect(requireAcceptedQuoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireAcceptedQuoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireAcceptedQuoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING must be true or false.')
    })
})

describe('estimate snapshot record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireEstimateSnapshotRecordBinding({})).toBe(false)
        expect(requireEstimateSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireEstimateSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireEstimateSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING must be true or false.')
    })
})

describe('contact snapshot record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireContactSnapshotRecordBinding({})).toBe(false)
        expect(requireContactSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireContactSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireContactSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING must be true or false.')
    })
})

describe('vehicle snapshot record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireVehicleSnapshotRecordBinding({})).toBe(false)
        expect(requireVehicleSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireVehicleSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireVehicleSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING must be true or false.')
    })
})

describe('service request note record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireServiceRequestNoteRecordBinding({})).toBe(false)
        expect(requireServiceRequestNoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireServiceRequestNoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireServiceRequestNoteRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING must be true or false.')
    })
})

describe('service request outcome record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireServiceRequestOutcomeRecordBinding({})).toBe(false)
        expect(requireServiceRequestOutcomeRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_OUTCOME_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireServiceRequestOutcomeRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_OUTCOME_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireServiceRequestOutcomeRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_OUTCOME_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_OUTCOME_RECORD_BINDING must be true or false.')
    })
})

describe('booking status reason record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireBookingStatusReasonRecordBinding({})).toBe(false)
        expect(requireBookingStatusReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireBookingStatusReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireBookingStatusReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_BOOKING_STATUS_REASON_RECORD_BINDING must be true or false.')
    })
})

describe('booking text record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireBookingTextRecordBinding({})).toBe(false)
        expect(requireBookingTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_TEXT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireBookingTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_TEXT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireBookingTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_TEXT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_BOOKING_TEXT_RECORD_BINDING must be true or false.')
    })
})

describe('booking reschedule reason record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireBookingRescheduleReasonRecordBinding({})).toBe(false)
        expect(requireBookingRescheduleReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_RESCHEDULE_REASON_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireBookingRescheduleReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_RESCHEDULE_REASON_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireBookingRescheduleReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_BOOKING_RESCHEDULE_REASON_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_BOOKING_RESCHEDULE_REASON_RECORD_BINDING must be true or false.')
    })
})

describe('AutoCare reschedule text record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireAutoCareRescheduleTextRecordBinding({})).toBe(false)
        expect(requireAutoCareRescheduleTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_AUTOCARE_RESCHEDULE_TEXT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireAutoCareRescheduleTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_AUTOCARE_RESCHEDULE_TEXT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireAutoCareRescheduleTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_AUTOCARE_RESCHEDULE_TEXT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_AUTOCARE_RESCHEDULE_TEXT_RECORD_BINDING must be true or false.')
    })
})

describe('service quote snapshot record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireServiceQuoteSnapshotRecordBinding({})).toBe(false)
        expect(requireServiceQuoteSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_QUOTE_SNAPSHOT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireServiceQuoteSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_QUOTE_SNAPSHOT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireServiceQuoteSnapshotRecordBinding({ DATA_ENCRYPTION_REQUIRE_SERVICE_QUOTE_SNAPSHOT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_SERVICE_QUOTE_SNAPSHOT_RECORD_BINDING must be true or false.')
    })
})

describe('chat report text record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireChatReportTextRecordBinding({})).toBe(false)
        expect(requireChatReportTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_REPORT_TEXT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireChatReportTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_REPORT_TEXT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireChatReportTextRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_REPORT_TEXT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CHAT_REPORT_TEXT_RECORD_BINDING must be true or false.')
    })
})

describe('chat block reason record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireChatBlockReasonRecordBinding({})).toBe(false)
        expect(requireChatBlockReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_BLOCK_REASON_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireChatBlockReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_BLOCK_REASON_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireChatBlockReasonRecordBinding({ DATA_ENCRYPTION_REQUIRE_CHAT_BLOCK_REASON_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CHAT_BLOCK_REASON_RECORD_BINDING must be true or false.')
    })
})

describe('trust evidence record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireTrustEvidenceRecordBinding({})).toBe(false)
        expect(requireTrustEvidenceRecordBinding({ DATA_ENCRYPTION_REQUIRE_TRUST_EVIDENCE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireTrustEvidenceRecordBinding({ DATA_ENCRYPTION_REQUIRE_TRUST_EVIDENCE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireTrustEvidenceRecordBinding({ DATA_ENCRYPTION_REQUIRE_TRUST_EVIDENCE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_TRUST_EVIDENCE_RECORD_BINDING must be true or false.')
    })
})

describe('provider change request record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireProviderChangeRequestRecordBinding({})).toBe(false)
        expect(requireProviderChangeRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_PROVIDER_CHANGE_REQUEST_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireProviderChangeRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_PROVIDER_CHANGE_REQUEST_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireProviderChangeRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_PROVIDER_CHANGE_REQUEST_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_PROVIDER_CHANGE_REQUEST_RECORD_BINDING must be true or false.')
    })
})

describe('appeal record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireAppealRecordBinding({})).toBe(false)
        expect(requireAppealRecordBinding({ DATA_ENCRYPTION_REQUIRE_APPEAL_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireAppealRecordBinding({ DATA_ENCRYPTION_REQUIRE_APPEAL_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireAppealRecordBinding({ DATA_ENCRYPTION_REQUIRE_APPEAL_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_APPEAL_RECORD_BINDING must be true or false.')
    })
})

describe('catalog gap record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireCatalogGapRecordBinding({})).toBe(false)
        expect(requireCatalogGapRecordBinding({ DATA_ENCRYPTION_REQUIRE_CATALOG_GAP_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireCatalogGapRecordBinding({ DATA_ENCRYPTION_REQUIRE_CATALOG_GAP_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireCatalogGapRecordBinding({ DATA_ENCRYPTION_REQUIRE_CATALOG_GAP_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CATALOG_GAP_RECORD_BINDING must be true or false.')
    })
})

describe('broadcast request record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireBroadcastRequestRecordBinding({})).toBe(false)
        expect(requireBroadcastRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_BROADCAST_REQUEST_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireBroadcastRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_BROADCAST_REQUEST_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireBroadcastRequestRecordBinding({ DATA_ENCRYPTION_REQUIRE_BROADCAST_REQUEST_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_BROADCAST_REQUEST_RECORD_BINDING must be true or false.')
    })
})

describe('repair event record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireRepairEventRecordBinding({})).toBe(false)
        expect(requireRepairEventRecordBinding({ DATA_ENCRYPTION_REQUIRE_REPAIR_EVENT_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireRepairEventRecordBinding({ DATA_ENCRYPTION_REQUIRE_REPAIR_EVENT_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireRepairEventRecordBinding({ DATA_ENCRYPTION_REQUIRE_REPAIR_EVENT_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_REPAIR_EVENT_RECORD_BINDING must be true or false.')
    })
})

describe('client vehicle record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireClientVehicleRecordBinding({})).toBe(false)
        expect(requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING must be true or false.')
    })
})
