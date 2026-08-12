import { describe, expect, it } from 'vitest'

import { boundExternalErrorContext, MAX_EXTERNAL_ERROR_CONTEXT_KEYS } from './error-report-policy.js'

describe('external error report policy', () => {
    it('keeps context keys bounded and ordered', () => {
        const context = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`key${index}`, index]))
        const bounded = boundExternalErrorContext(context)
        expect(Object.keys(bounded)).toHaveLength(MAX_EXTERNAL_ERROR_CONTEXT_KEYS)
        expect(Object.keys(bounded)[0]).toBe('key0')
    })
})
