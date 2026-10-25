import { describe, expect, it } from 'vitest'
import { requireEmailRecordBinding } from './record-binding-policy.js'

describe('email record binding cutover policy', () => {
    it('defaults to compatibility and accepts only explicit boolean values', () => {
        expect(requireEmailRecordBinding({})).toBe(false)
        expect(requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: 'false' })).toBe(false)
        expect(requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: 'true' })).toBe(true)
        expect(() => requireEmailRecordBinding({ DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING: '1' }))
            .toThrow('DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING must be true or false.')
    })
})
