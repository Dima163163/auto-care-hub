import { describe, expect, it } from 'vitest'

import {
    decodeCursor,
    encodeCursor,
    getCursorLimit,
    toCursorPage,
} from './cursor-pagination.js'

describe('cursor pagination', () => {
    it('round-trips an opaque cursor and returns the next cursor only when needed', () => {
        const cursor = encodeCursor({ createdAt: '2026-07-22T12:00:00.000Z', id: 'item-2' })
        const decoded = decodeCursor(cursor, ['createdAt', 'id'])

        expect(decoded).toEqual({
            createdAt: '2026-07-22T12:00:00.000Z',
            id: 'item-2',
        })

        const page = toCursorPage(
            [{ id: 'item-1' }, { id: 'item-2' }, { id: 'item-3' }],
            2,
            (item) => ({ id: item.id }),
        )

        expect(page.items).toHaveLength(2)
        expect(page.nextCursor).toBeTruthy()
    })

    it('rejects malformed cursors', () => {
        expect(() => decodeCursor('broken', ['id'])).toThrow('Cursor is invalid or expired.')
    })

    it('rejects oversized cursors before parsing input', () => {
        expect(() => decodeCursor('a'.repeat(2_049), ['id']))
            .toThrow('Cursor is invalid or expired.')
    })

    it('rejects oversized cursor payloads before base64 encoding', () => {
        expect(() => encodeCursor({ id: 'x'.repeat(1_600) }))
            .toThrow('Cursor payload is too large.')
    })

    it('rejects unsafe page limits at the shared service boundary', () => {
        expect(() => getCursorLimit(-1)).toThrow('Pagination limit is invalid.')
        expect(() => getCursorLimit(101)).toThrow('Pagination limit is invalid.')
    })

    it('rejects unsafe limits when building a cursor page directly', () => {
        expect(() => toCursorPage([{ id: 'one' }], 0, (item) => ({ id: item.id })))
            .toThrow('Pagination limit is invalid.')
    })
})
