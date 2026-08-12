import { describe, expect, it } from 'vitest'

import { getCabinetImageChecksum } from './cabinet-image-integrity.js'

describe('cabinet image checksum', () => {
    it('returns a stable SHA-256 content digest', () => {
        const checksum = getCabinetImageChecksum(Buffer.from('cabinet-image'))

        expect(checksum).toMatch(/^[a-f0-9]{64}$/)
        expect(getCabinetImageChecksum(Buffer.from('cabinet-image'))).toBe(checksum)
        expect(getCabinetImageChecksum(Buffer.from('other-image'))).not.toBe(checksum)
    })
})
