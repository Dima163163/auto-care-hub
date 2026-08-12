import { describe, expect, it } from 'vitest'

import { normalizeFrontendOrigin } from './frontend-origin-policy.js'

describe('frontend origin policy', () => {
    it('normalizes secure origins and local development origins', () => {
        expect(normalizeFrontendOrigin(' https://app.example.com/ ')).toBe('https://app.example.com')
        expect(normalizeFrontendOrigin('http://localhost:5173', { allowHttpLoopback: true }))
            .toBe('http://localhost:5173')
    })

    it('rejects unsafe or non-origin URLs', () => {
        expect(() => normalizeFrontendOrigin('http://app.example.com')).toThrow(/origin/)
        expect(() => normalizeFrontendOrigin('https://app.example.com/path')).toThrow(/origin/)
        expect(() => normalizeFrontendOrigin('https://user:pass@app.example.com')).toThrow(/origin/)
    })
})
