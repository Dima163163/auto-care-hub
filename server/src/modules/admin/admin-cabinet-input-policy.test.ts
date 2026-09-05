import { describe, expect, it } from 'vitest'

import { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import {
    normalizeAdminCabinetStatus,
    normalizeAdminCabinetUuid,
} from './admin-cabinet-input-policy.js'

describe('Admin cabinet input policy', () => {
    it('canonicalizes cabinet UUIDs and statuses', () => {
        const cabinetId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeAdminCabinetUuid(` ${cabinetId.toUpperCase()} `)).toBe(cabinetId)
        expect(normalizeAdminCabinetStatus(' BLOCKED ')).toBe(CabinetStatus.Blocked)
        expect(normalizeAdminCabinetStatus('ACTIVE')).toBe(CabinetStatus.Active)
    })

    it('rejects malformed identifiers and unsupported statuses', () => {
        expect(normalizeAdminCabinetUuid('cabinet-1')).toBeNull()
        expect(normalizeAdminCabinetUuid(null)).toBeNull()
        expect(normalizeAdminCabinetStatus('pending')).toBeNull()
        expect(normalizeAdminCabinetStatus(1)).toBeNull()
    })
})
