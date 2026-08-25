import { describe, expect, it } from 'vitest'

import { getSecurityHeadersOptions } from './security-headers'

describe('getSecurityHeadersOptions', () => {
    it('keeps uploaded images embeddable from a separate frontend domain', () => {
        const options = getSecurityHeadersOptions({
            isProduction: true,
        })

        expect(options.crossOriginResourcePolicy).toEqual({
            policy: 'cross-origin',
        })
        expect(options.crossOriginEmbedderPolicy).toBe(false)
    })

    it('denies iframe embedding for legacy frame protection', () => {
        const options = getSecurityHeadersOptions({
            isProduction: true,
        })

        expect(options.xFrameOptions).toEqual({
            action: 'deny',
        })
    })

    it('enables HSTS and HTTPS upgrades only in production', () => {
        const productionOptions = getSecurityHeadersOptions({
            isProduction: true,
        })
        const developmentOptions = getSecurityHeadersOptions({
            isProduction: false,
        })

        expect(productionOptions.hsts).toEqual({
            maxAge: 15552000,
            includeSubDomains: true,
        })
        expect(developmentOptions.hsts).toBe(false)
        expect(
            productionOptions.contentSecurityPolicy
                && typeof productionOptions.contentSecurityPolicy === 'object'
                && productionOptions.contentSecurityPolicy.directives?.upgradeInsecureRequests
        ).toEqual([])
        expect(
            developmentOptions.contentSecurityPolicy
                && typeof developmentOptions.contentSecurityPolicy === 'object'
                && developmentOptions.contentSecurityPolicy.directives?.upgradeInsecureRequests
        ).toBeNull()
    })

    it('allows only same-origin connections, frames, and scripts', () => {
        const options = getSecurityHeadersOptions({
            isProduction: true,
        })
        const directives = options.contentSecurityPolicy.directives

        expect(directives.connectSrc).toEqual(["'self'"])
        expect(directives.frameSrc).toEqual(["'self'"])
        expect(directives.scriptSrc).toEqual(["'self'"])
    })

    it('uses a strict referrer policy', () => {
        const options = getSecurityHeadersOptions({
            isProduction: true,
        })

        expect(options.referrerPolicy).toEqual({
            policy: 'no-referrer',
        })
    })

    it('disables camera, location, and microphone capabilities', () => {
        const options = getSecurityHeadersOptions({ isProduction: true })

        expect(options.noSniff).toBe(true)
        expect(options.permissionsPolicy).toEqual({
            features: { camera: [], geolocation: [], microphone: [] },
        })
    })
})
