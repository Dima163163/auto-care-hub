import { describe, expect, it } from 'vitest'
import { requireEmailRecordBinding, requireMessageBodyRecordBinding, requireMessageOfferRecordBinding, requireOAuthRecordBinding, requireOutboxRecordBinding, requireUserProfileRecordBinding } from './record-binding-policy.js'

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
