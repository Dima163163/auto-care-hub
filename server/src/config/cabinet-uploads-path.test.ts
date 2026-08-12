import { describe, expect, it } from 'vitest'

import { resolveCabinetUploadsDir } from './cabinet-uploads-path.js'

describe('resolveCabinetUploadsDir', () => {
    it('keeps the local default relative to the server working directory', () => {
        expect(resolveCabinetUploadsDir(undefined, '/srv/autocarehub')).toBe(
            '/srv/autocarehub/uploads/cabinets',
        )
    })

    it('supports an absolute persistent-volume path', () => {
        expect(resolveCabinetUploadsDir(' /var/data/autocarehub/uploads/cabinets ', '/srv/autocarehub')).toBe(
            '/var/data/autocarehub/uploads/cabinets',
        )
    })

    it('normalizes a configured relative path without exposing the raw value', () => {
        expect(resolveCabinetUploadsDir('media/cabinets', '/srv/autocarehub')).toBe(
            '/srv/autocarehub/media/cabinets',
        )
    })
})
