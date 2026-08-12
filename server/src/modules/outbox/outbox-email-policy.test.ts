import { describe, expect, it } from 'vitest'

import {
    MAX_OUTBOX_EMAIL_TITLE_LENGTH,
    MAX_OUTBOX_RECIPIENT_NAME_LENGTH,
    normalizeOutboxEmailText,
} from './outbox-email-policy.js'

describe('outbox email text policy', () => {
    it('normalizes recipient and title text', () => {
        expect(normalizeOutboxEmailText('  Client\nName ', MAX_OUTBOX_RECIPIENT_NAME_LENGTH, 'recipient name'))
            .toBe('Client Name')
    })

    it('rejects empty and oversized text', () => {
        expect(() => normalizeOutboxEmailText(' ', MAX_OUTBOX_RECIPIENT_NAME_LENGTH, 'recipient name')).toThrow(/recipient name/)
        expect(() => normalizeOutboxEmailText('x'.repeat(MAX_OUTBOX_EMAIL_TITLE_LENGTH + 1), MAX_OUTBOX_EMAIL_TITLE_LENGTH, 'title')).toThrow(/title/)
    })
})
