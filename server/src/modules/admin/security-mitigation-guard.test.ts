import { describe, expect, it, afterEach } from 'vitest'

import {
    cacheSecurityMitigation,
    clearSecurityMitigationCache,
    isSecurityMitigationCached,
    removeCachedSecurityMitigation,
    shouldRecordSecurityMitigationSignal,
} from './security-mitigation-guard.js'
import { normalizeIpAddress } from '../../shared/security/trusted-proxy.js'

describe('Security mitigation guard', () => {
    afterEach(() => clearSecurityMitigationCache())

    it('matches canonical IPv4 keys and expires them without a database read', () => {
        const now = Date.now()
        const canonicalKey = normalizeIpAddress('192.0.2.10')
        expect(canonicalKey).toBe('4:c000020a')
        cacheSecurityMitigation(canonicalKey!, now + 60_000)

        expect(isSecurityMitigationCached('192.0.2.10', now)).toBe(true)
        expect(isSecurityMitigationCached('192.0.2.10', now + 60_000)).toBe(false)
    })

    it('removes a mitigation immediately when it is revoked', () => {
        const canonicalKey = normalizeIpAddress('192.0.2.10')
        cacheSecurityMitigation(canonicalKey!, Date.now() + 60_000)
        removeCachedSecurityMitigation(canonicalKey!)

        expect(isSecurityMitigationCached('192.0.2.10')).toBe(false)
    })

    it('throttles repeated blocked-IP signals without suppressing a later window', () => {
        const now = Date.now()

        expect(shouldRecordSecurityMitigationSignal('192.0.2.10', now)).toBe(true)
        expect(shouldRecordSecurityMitigationSignal('192.0.2.10', now + 59_999)).toBe(false)
        expect(shouldRecordSecurityMitigationSignal('192.0.2.10', now + 60_000)).toBe(true)
    })
})
