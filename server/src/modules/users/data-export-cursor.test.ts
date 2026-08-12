import { describe, expect, it } from 'vitest'

import { decodeDataExportCursor, encodeDataExportCursor } from './data-export-cursor.js'

describe('data export cursor', () => {
    it('round-trips bounded continuation data', () => {
        const cursor = encodeDataExportCursor({ createdAt: '2026-07-29T00:00:00.000Z', id: 'record-1' })
        expect(decodeDataExportCursor(cursor)).toEqual({ createdAt: '2026-07-29T00:00:00.000Z', id: 'record-1' })
    })

    it('rejects malformed or oversized cursors', () => {
        expect(() => decodeDataExportCursor('not a cursor')).toThrow()
        expect(() => decodeDataExportCursor('a'.repeat(513))).toThrow()
    })
})
