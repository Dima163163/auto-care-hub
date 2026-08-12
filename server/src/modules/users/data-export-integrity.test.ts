import { describe, expect, it } from 'vitest'

import { getDataExportIntegrityChecksum } from './data-export-integrity.js'

describe('data export integrity', () => {
    it('returns a stable SHA-256 checksum for the serialized export', () => {
        const first = getDataExportIntegrityChecksum({ safe: true, count: 2 })
        expect(first).toMatch(/^[a-f0-9]{64}$/)
        expect(getDataExportIntegrityChecksum({ safe: true, count: 2 })).toBe(first)
    })
})
