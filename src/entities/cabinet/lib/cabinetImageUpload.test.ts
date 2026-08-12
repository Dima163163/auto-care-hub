import { describe, expect, it } from 'vitest'

import {
    CABINET_IMAGE_MAX_SIZE_BYTES,
    validateCabinetImageFile,
} from './cabinetImageUpload'

describe('validateCabinetImageFile', () => {
    it('allows supported image types regardless of source size', () => {
        expect(
            validateCabinetImageFile({
                size: CABINET_IMAGE_MAX_SIZE_BYTES,
                type: 'image/webp',
            }),
        ).toEqual({ isValid: true })
    })

    it('rejects unsupported image types', () => {
        expect(
            validateCabinetImageFile({
                size: 100,
                type: 'image/gif',
            }),
        ).toEqual({
            isValid: false,
            reason: 'unsupportedType',
        })
    })

    it('allows large source images because they are normalized before upload', () => {
        expect(
            validateCabinetImageFile({
                size: CABINET_IMAGE_MAX_SIZE_BYTES + 1,
                type: 'image/png',
            }),
        ).toEqual({ isValid: true })
    })
})
