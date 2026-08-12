import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
    clearFormDraft,
    FORM_DRAFT_VERSION,
    MAX_FORM_DRAFT_BYTES,
    readFormDraft,
    writeFormDraft,
} from './form-draft'

describe('form draft storage', () => {
    const storageKey = 'autocare-hub:test-draft'
    const parseObject = (value: unknown) =>
        typeof value === 'object' && value !== null && !Array.isArray(value)
            ? value
            : null

    beforeEach(() => {
        window.localStorage.clear()
    })

    it('round-trips a bounded object', () => {
        expect(writeFormDraft(storageKey, { title: 'Quiet room', price: 1500 })).toBe(
            true,
        )
        expect(readFormDraft(storageKey, parseObject)).toEqual({ title: 'Quiet room', price: 1500 })
        expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
            version: FORM_DRAFT_VERSION,
        })
    })

    it('ignores malformed, oversized, and non-object values', () => {
        window.localStorage.setItem(storageKey, '{broken')
        expect(readFormDraft(storageKey, parseObject)).toBeNull()

        window.localStorage.setItem(storageKey, JSON.stringify(['unsafe']))
        expect(readFormDraft(storageKey, parseObject)).toBeNull()

        window.localStorage.setItem(
            storageKey,
            JSON.stringify({ value: 'x'.repeat(MAX_FORM_DRAFT_BYTES) }),
        )
        expect(readFormDraft(storageKey, parseObject)).toBeNull()

        window.localStorage.setItem(
            storageKey,
            JSON.stringify({ version: FORM_DRAFT_VERSION + 1, data: { title: 'future' } }),
        )
        expect(readFormDraft(storageKey, parseObject)).toBeNull()
    })

    it('clears a stored draft and tolerates storage failures', () => {
        writeFormDraft(storageKey, { title: 'Temporary' })
        clearFormDraft(storageKey)
        expect(readFormDraft(storageKey, parseObject)).toBeNull()

        const setItemSpy = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('quota exceeded')
            })

        expect(writeFormDraft(storageKey, { title: 'Temporary' })).toBe(false)
        setItemSpy.mockRestore()
    })
})
