import { describe, expect, it } from 'vitest'

import { assertJsonContentType, isJsonContentType } from './content-type-guard.js'

describe('JSON content type guard', () => {
    it('accepts JSON media types with parameters and suffixes', () => {
        expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
        expect(isJsonContentType('application/problem+json')).toBe(true)
        expect(isJsonContentType('text/plain')).toBe(false)
    })

    it('requires JSON only when a request has a body', () => {
        expect(() => assertJsonContentType(undefined, false)).not.toThrow()
        expect(() => assertJsonContentType('text/plain', true)).toThrow()
    })
})
