import { describe, expect, it } from 'vitest'

import {
    getSafeErrorDetail,
    MAX_SAFE_ERROR_DETAIL_LENGTH,
} from './safe-error-detail.js'

describe('safe error details', () => {
    it('redacts sensitive diagnostics before persistence', () => {
        expect(getSafeErrorDetail(new Error('token=top-secret'))).toBe('[REDACTED_ERROR_MESSAGE]')
    })

    it('keeps non-sensitive details bounded', () => {
        const detail = getSafeErrorDetail(new Error('x'.repeat(700)))

        expect(detail).toHaveLength(MAX_SAFE_ERROR_DETAIL_LENGTH)
    })

    it('uses a stable fallback for unknown values', () => {
        expect(getSafeErrorDetail({ reason: 'unstructured' }, 'Webhook failed')).toBe('Webhook failed')
    })

    it('removes control characters from persisted details', () => {
        expect(getSafeErrorDetail(new Error(' provider\nmessage\r '))).toBe('provider message')
    })
})
