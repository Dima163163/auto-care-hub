import { describe, expect, it } from 'vitest'

import {
    MAX_CABINET_IMAGE_METADATA_BYTES,
    serializeCabinetImageMetadata,
} from './cabinet-image-metadata.js'

describe('cabinet image metadata', () => {
    it('serializes safe metadata without arbitrary fields', () => {
        expect(serializeCabinetImageMetadata({
            key: 'abc.webp',
            contentType: 'image/webp',
            bytes: 42,
        })).toEqual({
            key: 'abc.webp',
            contentType: 'image/webp',
            bytes: 42,
        })
    })

    it('rejects unsafe keys, types, and sizes', () => {
        expect(() => serializeCabinetImageMetadata({ key: '../secret', contentType: 'image/webp', bytes: 1 })).toThrow()
        expect(() => serializeCabinetImageMetadata({ key: 'abc.webp', contentType: 'image/svg+xml', bytes: 1 })).toThrow()
        expect(() => serializeCabinetImageMetadata({ key: 'abc.webp', contentType: 'image/webp', bytes: MAX_CABINET_IMAGE_METADATA_BYTES + 1 })).toThrow()
    })
})
