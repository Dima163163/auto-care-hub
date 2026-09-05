import { describe, expect, it } from 'vitest'

import { SecurityMitigationKind } from '../../entities/security-mitigation/security-mitigation.entity.js'
import {
    normalizeSecurityMitigationCreateInput,
    normalizeSecurityMitigationExtensionMinutes,
    normalizeSecurityMitigationIpInput,
    normalizeSecurityMitigationReasonInput,
    normalizeSecurityMitigationUuid,
    normalizeSecurityMitigationsQuery,
} from './security-mitigation-input-policy.js'

describe('Security mitigation input policy', () => {
    it('normalizes bounded create and query inputs', () => {
        expect(normalizeSecurityMitigationCreateInput({
            kind: ' IP_BLOCK ',
            ipAddress: ' 192.0.2.10 ',
            reason: '  Automated\n abuse  ',
            ttlMinutes: 60,
        })).toEqual({
            kind: SecurityMitigationKind.IpBlock,
            ipAddress: { displayValue: '192.0.2.10', normalizedValue: '4:c000020a' },
            reason: 'Automated abuse',
            ttlMinutes: 60,
        })
        expect(normalizeSecurityMitigationsQuery({
            status: ' expired ',
            ipAddress: ' 192.0.2.10 ',
            limit: 25,
        })).toEqual({
            status: 'expired',
            ipAddress: '192.0.2.10',
            kind: SecurityMitigationKind.IpBlock,
            limit: 25,
        })
    })

    it('rejects unknown keys and malformed values before persistence', () => {
        expect(normalizeSecurityMitigationsQuery(null)).toBeNull()
        expect(normalizeSecurityMitigationCreateInput({
            kind: SecurityMitigationKind.IpBlock,
            ipAddress: '192.0.2.10',
            reason: 'Automated abuse',
            ttlMinutes: 60,
            extra: true,
        })).toBeNull()
        expect(normalizeSecurityMitigationIpInput('not-an-ip')).toBeNull()
        expect(normalizeSecurityMitigationReasonInput('\u0000')).toBeNull()
        expect(normalizeSecurityMitigationReasonInput('x'.repeat(501))).toBeNull()
    })

    it('bounds query, TTL and extension values', () => {
        expect(normalizeSecurityMitigationsQuery({ limit: 0 })).toBeNull()
        expect(normalizeSecurityMitigationsQuery({ limit: 101 })).toBeNull()
        expect(normalizeSecurityMitigationsQuery({ cursor: 'x'.repeat(513) })).toBeNull()
        expect(normalizeSecurityMitigationCreateInput({
            ipAddress: '192.0.2.10',
            reason: 'Automated abuse',
            ttlMinutes: 1_441,
        })).toBeNull()
        expect(normalizeSecurityMitigationExtensionMinutes(1)).toBe(1)
        expect(normalizeSecurityMitigationExtensionMinutes(1_440)).toBe(1_440)
        expect(normalizeSecurityMitigationExtensionMinutes(1_441)).toBeNull()
        expect(normalizeSecurityMitigationExtensionMinutes('60')).toBeNull()
    })

    it('accepts canonical UUIDs and rejects forged identifiers', () => {
        const id = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeSecurityMitigationUuid(` ${id.toUpperCase()} `)).toBe(id)
        expect(normalizeSecurityMitigationUuid('mitigation-1')).toBeNull()
        expect(normalizeSecurityMitigationUuid(undefined)).toBeNull()
    })
})
