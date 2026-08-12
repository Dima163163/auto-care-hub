import { describe, expect, it } from 'vitest'

import {
    MAX_EXPORT_METADATA_STRING_LENGTH,
    sanitizeExportMetadata,
} from './data-export-privacy.js'

describe('data export metadata privacy', () => {
    it('keeps allowlisted finite values and removes controls', () => {
        expect(sanitizeExportMetadata({
            bookingId: 'booking-1\n',
            status: 'confirmed',
            amount: Number.POSITIVE_INFINITY,
            ignored: 'value',
        })).toEqual({ bookingId: 'booking-1', status: 'confirmed' })
    })

    it('drops oversized metadata strings', () => {
        expect(sanitizeExportMetadata({
            bookingId: 'x'.repeat(MAX_EXPORT_METADATA_STRING_LENGTH + 1),
        })).toEqual({})
    })
})
