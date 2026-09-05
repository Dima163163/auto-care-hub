import { describe, expect, it } from 'vitest'

import { normalizeAutoCareChatMessageInput, normalizeAutoCareMessageBody, normalizeAutoCareServiceMessageInput } from './message-content-policy.js'

describe('AutoCare message content policy', () => {
    it('normalizes Unicode and surrounding whitespace', () => {
        expect(normalizeAutoCareMessageBody('  Ｈｅｌｌｏ, сервис!  ')).toBe('Hello, сервис!')
    })

    it('fails closed for empty, non-string and oversized bodies', () => {
        expect(normalizeAutoCareMessageBody('   ')).toBeNull()
        expect(normalizeAutoCareMessageBody(null)).toBeNull()
        expect(normalizeAutoCareMessageBody('x'.repeat(4_001))).toBeNull()
    })

    it('normalizes chat message payloads and rejects unknown fields', () => {
        expect(normalizeAutoCareChatMessageInput({ body: '  Привет  ' })).toEqual({ body: 'Привет' })
        expect(normalizeAutoCareChatMessageInput({ body: 'Привет', metadata: true })).toBeNull()
        expect(normalizeAutoCareChatMessageInput(null)).toBeNull()
    })

    it('normalizes service message idempotency keys before persistence', () => {
        expect(normalizeAutoCareServiceMessageInput({ body: '  Повторная доставка  ', idempotencyKey: ' msg_12345 ' })).toEqual({ body: 'Повторная доставка', idempotencyKey: 'msg_12345' })
        expect(normalizeAutoCareServiceMessageInput({ body: 'Сообщение' })).toEqual({ body: 'Сообщение' })
        expect(normalizeAutoCareServiceMessageInput({ body: 'Сообщение', extra: true })).toBeNull()
    })
})
