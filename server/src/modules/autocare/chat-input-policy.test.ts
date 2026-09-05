import { describe, expect, it } from 'vitest'

import { normalizeAutoCareChatInput, normalizeAutoCareChatUuid } from './chat-input-policy.js'

describe('AutoCare chat input policy', () => {
    it('canonicalizes chat identifiers and subject', () => {
        expect(normalizeAutoCareChatInput({ type: 'support', providerId: '11111111-1111-4111-8111-111111111111'.toUpperCase(), requestId: '22222222-2222-4222-8222-222222222222', subject: '  Помощь\u00a0с записью  ' })).toEqual({ type: 'support', providerId: '11111111-1111-4111-8111-111111111111', requestId: '22222222-2222-4222-8222-222222222222', subject: 'Помощь с записью' })
    })

    it('allows optional identifiers to be omitted', () => {
        expect(normalizeAutoCareChatInput({ type: 'admin_escalation', subject: 'Platform support' })).toEqual({ type: 'admin_escalation', subject: 'Platform support' })
    })

    it('rejects malformed types, UUIDs and subjects', () => {
        const base = { type: 'support', subject: 'Need help' }
        expect(normalizeAutoCareChatInput({ ...base, type: 'unknown' })).toBeNull()
        expect(normalizeAutoCareChatInput({ ...base, providerId: 'not-a-uuid' })).toBeNull()
        expect(normalizeAutoCareChatInput({ ...base, subject: 'x' })).toBeNull()
        expect(normalizeAutoCareChatInput({ ...base, subject: 'line\nfeed' })).toBeNull()
        expect(normalizeAutoCareChatInput({ ...base, extra: true })).toBeNull()
        expect(normalizeAutoCareChatInput(null)).toBeNull()
    })

    it('rejects oversized or non-string subjects', () => {
        expect(normalizeAutoCareChatInput({ type: 'support', subject: 'x'.repeat(161) })).toBeNull()
        expect(normalizeAutoCareChatInput({ type: 'support', subject: 42 })).toBeNull()
    })

    it('canonicalizes chat, block, attachment and request identifiers', () => {
        expect(normalizeAutoCareChatUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeAutoCareChatUuid('not-a-uuid')).toBeNull()
        expect(normalizeAutoCareChatUuid({})).toBeNull()
    })
})
