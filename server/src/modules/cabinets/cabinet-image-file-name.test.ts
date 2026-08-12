import { describe, expect, it } from 'vitest'

import { normalizeCabinetImageFileName } from './cabinet-image-file-name.js'

describe('cabinet image file name policy', () => {
    it('normalizes valid object keys', () => {
        expect(normalizeCabinetImageFileName(' abc-123.jpg ')).toBe('abc-123.jpg')
        expect(normalizeCabinetImageFileName('abc-thumb.webp')).toBe('abc-thumb.webp')
    })

    it('rejects traversal, unsupported suffixes, and oversized keys', () => {
        expect(() => normalizeCabinetImageFileName('../abc.jpg')).toThrow(/invalid/)
        expect(() => normalizeCabinetImageFileName('abc.txt')).toThrow(/invalid/)
        expect(() => normalizeCabinetImageFileName('ABC-123.JPG')).toThrow(/invalid/)
        expect(() => normalizeCabinetImageFileName(`${'a'.repeat(128)}.jpg`)).toThrow(/invalid/)
    })
})
