import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
    clearAdminAuditFilter,
    readAdminAuditFilter,
    writeAdminAuditFilter,
} from './admin-audit-filters'

describe('admin audit filter storage', () => {
    beforeEach(() => {
        window.sessionStorage.clear()
    })

    it('round-trips a bounded normalized filter', () => {
        expect(writeAdminAuditFilter('  booking\ncreated  ')).toBe(true)
        expect(readAdminAuditFilter()).toEqual({ query: 'booking created' })
    })

    it('ignores malformed or empty values', () => {
        window.sessionStorage.setItem('autocare-hub:admin-audit-filter:v1', '{broken')
        expect(readAdminAuditFilter()).toBeNull()

        window.sessionStorage.setItem(
            'autocare-hub:admin-audit-filter:v1',
            JSON.stringify({ query: '' }),
        )
        expect(readAdminAuditFilter()).toBeNull()
    })

    it('tolerates storage failures', () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('storage blocked')
        })

        expect(writeAdminAuditFilter('request-123')).toBe(false)
        setItemSpy.mockRestore()

        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('storage blocked')
        })
        expect(() => clearAdminAuditFilter()).not.toThrow()
        removeItemSpy.mockRestore()
    })
})
