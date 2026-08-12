import { describe, expect, it } from 'vitest'

import {
    assertNotificationMetadataWithinBounds,
    MAX_NOTIFICATION_METADATA_BYTES,
    MAX_NOTIFICATION_METADATA_KEYS,
} from './notification-metadata-policy.js'

describe('notification metadata policy', () => {
    it('accepts small operational metadata', () => {
        expect(assertNotificationMetadataWithinBounds({ bookingId: 'booking-1' })).toEqual({ bookingId: 'booking-1' })
    })

    it('rejects oversized metadata', () => {
        expect(() => assertNotificationMetadataWithinBounds({ value: 'x'.repeat(MAX_NOTIFICATION_METADATA_BYTES) })).toThrow()
    })

    it('rejects metadata with too many keys', () => {
        const metadata = Object.fromEntries(Array.from({ length: MAX_NOTIFICATION_METADATA_KEYS + 1 }, (_, index) => [`key${index}`, index]))
        expect(() => assertNotificationMetadataWithinBounds(metadata)).toThrow(/keys/)
    })
})
