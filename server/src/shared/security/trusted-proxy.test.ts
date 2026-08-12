import { describe, expect, it } from 'vitest'

import {
    createTrustedProxyPolicy,
    MAX_TRUSTED_PROXY_CIDRS,
    MAX_TRUSTED_PROXY_HOPS,
    validateTrustedProxyConfig,
    validateTrustedProxyCidrs,
} from './trusted-proxy.js'

describe('trusted proxy policy', () => {
    it('trusts only allowlisted proxy addresses within the configured hop limit', () => {
        const policy = createTrustedProxyPolicy({
            hops: 1,
            cidrs: ['10.0.0.0/8', '2001:db8::/32'],
        })

        expect(policy('10.24.8.3', 0)).toBe(true)
        expect(policy('10.24.8.3', 1)).toBe(false)
        expect(policy('192.168.1.4', 0)).toBe(false)
        expect(policy('2001:db8:abcd::10', 0)).toBe(true)
        expect(policy('2001:db9::10', 0)).toBe(false)
    })

    it('handles IPv4-mapped IPv6 socket addresses', () => {
        const policy = createTrustedProxyPolicy({
            hops: 1,
            cidrs: ['127.0.0.1/32'],
        })

        expect(policy('::ffff:127.0.0.1', 0)).toBe(true)
    })

    it('rejects malformed proxy ranges during configuration validation', () => {
        expect(() => validateTrustedProxyCidrs(['10.0.0.0/33'])).toThrow()
        expect(() => validateTrustedProxyCidrs(['10.0.0.0/'])).toThrow()
        expect(() => validateTrustedProxyCidrs(['not-an-ip'])).toThrow()
        expect(() => validateTrustedProxyCidrs(['2001:db8::/129'])).toThrow()
    })

    it('does not trust a spoofed header when the socket peer is not allowlisted', () => {
        const policy = createTrustedProxyPolicy({
            hops: 1,
            cidrs: ['10.0.0.0/8'],
        })

        expect(policy('198.51.100.8', 0)).toBe(false)
    })

    it('rejects excessive hop and CIDR configuration', () => {
        expect(() => validateTrustedProxyConfig({
            hops: MAX_TRUSTED_PROXY_HOPS + 1,
            cidrs: [],
        })).toThrow(/hops/)
        expect(() => validateTrustedProxyCidrs(
            Array.from({ length: MAX_TRUSTED_PROXY_CIDRS + 1 }, () => '10.0.0.0/8'),
        )).toThrow(/CIDRs/)
    })
})
