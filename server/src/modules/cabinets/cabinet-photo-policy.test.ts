import { describe, expect, it } from 'vitest'

import { assertCabinetPhotoList, MAX_CABINET_PHOTOS } from './cabinet-photo-policy.js'

describe('cabinet photo policy', () => {
    it('accepts a bounded photo list', () => {
        expect(assertCabinetPhotoList([' /uploads/cabinets/one.jpg '])).toEqual(['/uploads/cabinets/one.jpg'])
    })

    it('rejects oversized and malformed photo lists', () => {
        expect(() => assertCabinetPhotoList(Array.from({ length: MAX_CABINET_PHOTOS + 1 }, () => '/photo.jpg')))
            .toThrow(/invalid/)
        expect(() => assertCabinetPhotoList([''])).toThrow(/invalid/)
    })
})
