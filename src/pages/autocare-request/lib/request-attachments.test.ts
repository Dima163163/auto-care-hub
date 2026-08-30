import { describe, expect, it } from 'vitest'

import { MAX_REQUEST_ATTACHMENTS, selectRequestImageFiles } from './request-attachments'

function file(name: string, type: string, size = 1024) {
    return new File([new Uint8Array(size)], name, { type })
}

describe('selectRequestImageFiles', () => {
    it('keeps supported images and reports invalid files', () => {
        const result = selectRequestImageFiles([
            file('damage.jpg', 'image/jpeg'),
            file('script.svg', 'image/svg+xml'),
            file('large.png', 'image/png', 10 * 1024 * 1024 + 1),
        ])

        expect(result.files).toHaveLength(1)
        expect(result.files[0]?.name).toBe('damage.jpg')
        expect(result.invalidCount).toBe(2)
        expect(result.tooManyCount).toBe(0)
    })

    it('limits the selection without discarding valid files silently', () => {
        const result = selectRequestImageFiles(
            Array.from({ length: MAX_REQUEST_ATTACHMENTS + 2 }, (_, index) => file(`damage-${index}.jpg`, 'image/jpeg')),
        )

        expect(result.files).toHaveLength(MAX_REQUEST_ATTACHMENTS)
        expect(result.invalidCount).toBe(0)
        expect(result.tooManyCount).toBe(2)
    })

    it('returns an empty clean selection when no files are chosen', () => {
        expect(selectRequestImageFiles([])).toEqual({ files: [], invalidCount: 0, tooManyCount: 0 })
    })
})
