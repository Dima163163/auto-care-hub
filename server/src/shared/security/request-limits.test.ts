import { describe, expect, it } from 'vitest'

import {
    assertPositiveByteLimit,
    getUtf8ByteLength,
    isWithinUtf8ByteLimit,
} from './request-limits.js'

describe('request byte limits', () => {
    it('counts UTF-8 bytes instead of JavaScript code units', () => {
        expect(getUtf8ByteLength('Привет')).toBeGreaterThan('Привет'.length)
        expect(isWithinUtf8ByteLimit('Привет', 11)).toBe(false)
        expect(isWithinUtf8ByteLimit('Привет', 12)).toBe(true)
    })

    it('rejects invalid limit configuration', () => {
        expect(() => assertPositiveByteLimit(0)).toThrow(/positive/)
        expect(() => assertPositiveByteLimit(Number.NaN)).toThrow(/positive/)
        expect(() => assertPositiveByteLimit(1024)).not.toThrow()
    })
})
