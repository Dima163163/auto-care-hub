import { describe, expect, it } from 'vitest'
import { requireAcceptedQuoteRecordBinding, requireEstimateSnapshotRecordBinding, requireContactSnapshotRecordBinding, requireVehicleSnapshotRecordBinding, requireServiceRequestNoteRecordBinding, requireClientVehicleRecordBinding, requireBookingSnapshotRecordBinding, requireChatSubjectRecordBinding, requireEmailRecordBinding, requireMessageBodyRecordBinding, requireMessageOfferRecordBinding, requireOAuthRecordBinding, requireOutboxRecordBinding, requireUserProfileRecordBinding } from './record-binding-policy.js'

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

describe('client vehicle record binding policy', () => {
    it('requires an explicit boolean switch', () => {
        expect(requireClientVehicleRecordBinding({})).toBe(false)
        expect(requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireClientVehicleRecordBinding({ DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING must be true or false.')
    })
})
