import { describe, expect, it } from 'vitest'

import { parseApiErrorData } from './api-error-shape'

describe('API error shape', () => {
    it('keeps a bounded string error code', () => {
        expect(parseApiErrorData({ code: 'CSRF_TOKEN_MISMATCH' })).toEqual({
            code: 'CSRF_TOKEN_MISMATCH',
        })
    })

    it('fails closed for malformed external payloads', () => {
        expect(parseApiErrorData({ code: 401 })).toEqual({})
        expect(parseApiErrorData([])).toBeUndefined()
        expect(parseApiErrorData(null)).toBeUndefined()
    })
})
