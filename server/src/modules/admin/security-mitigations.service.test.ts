import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    createSecurityMitigation,
    extendSecurityMitigation,
    getSecurityMitigations,
    normalizeSecurityMitigationIp,
    revokeSecurityMitigation,
} from './security-mitigations.service.js'

describe('Security Center mitigations service', () => {
    it('normalizes IP input without using the display value as the lookup key', () => {
        expect(normalizeSecurityMitigationIp(' 192.0.2.10 ')).toEqual({
            displayValue: '192.0.2.10',
            normalizedValue: '4:c000020a',
        })
        expect(() => normalizeSecurityMitigationIp('not-an-ip')).toThrowError(/valid IP address/)
    })

    it('requires super-admin access before reading or mutating mitigations', async () => {
        const admin = { role: UserRole.Admin } as never

        await expect(getSecurityMitigations(admin)).rejects.toMatchObject({ statusCode: 403 })
        await expect(createSecurityMitigation(admin, {
            kind: 'ip_block',
            ipAddress: '192.0.2.10',
            reason: 'Automated abuse',
            ttlMinutes: 60,
        })).rejects.toMatchObject({ statusCode: 403 })
        await expect(revokeSecurityMitigation(admin, 'mitigation-1')).rejects.toMatchObject({ statusCode: 403 })
        await expect(extendSecurityMitigation(admin, 'mitigation-1', 15)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects malformed super-admin inputs before touching the repository', async () => {
        const superAdmin = { role: UserRole.SuperAdmin } as never

        await expect(createSecurityMitigation(superAdmin, {
            kind: 'ip_block',
            ipAddress: '192.0.2.10',
            reason: 'Automated abuse',
            ttlMinutes: 60,
            unexpected: true,
        })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getSecurityMitigations(superAdmin, {
            status: 'active',
            kind: 'ip_block',
            unexpected: true,
        })).rejects.toMatchObject({ statusCode: 422 })
        await expect(revokeSecurityMitigation(superAdmin, 'mitigation-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(extendSecurityMitigation(superAdmin, 'mitigation-1', 15)).rejects.toMatchObject({ statusCode: 422 })
    })
})
