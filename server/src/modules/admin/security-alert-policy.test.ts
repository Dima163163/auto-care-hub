import { afterEach, describe, expect, it } from 'vitest'

import {
    SecurityEventSeverity,
    SecurityEventType,
} from '../../entities/security-event/security-event.entity.js'
import {
    observeSecurityAlert,
    resetSecurityAlertPolicy,
    SECURITY_EVENT_ALERT_THRESHOLD,
} from './security-alert-policy.js'

describe('security alert policy', () => {
    afterEach(() => resetSecurityAlertPolicy())

    it('triggers one burst alert per type and route window', () => {
        const now = Date.now()
        for (let index = 1; index < SECURITY_EVENT_ALERT_THRESHOLD; index += 1) {
            expect(observeSecurityAlert({
                type: SecurityEventType.RouteScan,
                severity: SecurityEventSeverity.Warning,
                route: '/api/cabinets',
            }, now + index)).toMatchObject({ triggered: false, count: index })
        }

        expect(observeSecurityAlert({
            type: SecurityEventType.RouteScan,
            severity: SecurityEventSeverity.Warning,
            route: '/api/cabinets',
        }, now + SECURITY_EVENT_ALERT_THRESHOLD)).toMatchObject({
            triggered: true,
            count: SECURITY_EVENT_ALERT_THRESHOLD,
            reason: 'burst_threshold',
        })
        expect(observeSecurityAlert({
            type: SecurityEventType.RouteScan,
            severity: SecurityEventSeverity.Warning,
            route: '/api/cabinets',
        }, now + SECURITY_EVENT_ALERT_THRESHOLD + 1).triggered).toBe(false)
    })

    it('raises a critical alert immediately and expires it with the window', () => {
        const now = Date.now()
        expect(observeSecurityAlert({
            type: SecurityEventType.RefreshTokenReuse,
            severity: SecurityEventSeverity.Critical,
            route: '/auth/refresh',
        }, now)).toMatchObject({ triggered: true, reason: 'critical_event' })
        expect(observeSecurityAlert({
            type: SecurityEventType.RefreshTokenReuse,
            severity: SecurityEventSeverity.Critical,
            route: '/auth/refresh',
        }, now + 1).triggered).toBe(false)
        expect(observeSecurityAlert({
            type: SecurityEventType.RefreshTokenReuse,
            severity: SecurityEventSeverity.Critical,
            route: '/auth/refresh',
        }, now + 60_001).triggered).toBe(true)
    })

    it('keeps independent routes independently bounded', () => {
        const now = Date.now()
        for (let index = 0; index < (SECURITY_EVENT_ALERT_THRESHOLD - 1) * 2; index += 1) {
            observeSecurityAlert({
                type: SecurityEventType.MutationBurst,
                severity: SecurityEventSeverity.Warning,
                route: index % 2 === 0 ? '/api/a' : '/api/b',
            }, now + index)
        }

        expect(observeSecurityAlert({
            type: SecurityEventType.MutationBurst,
            severity: SecurityEventSeverity.Warning,
            route: '/api/a',
        }, now + 30)).toMatchObject({
            triggered: true,
            count: SECURITY_EVENT_ALERT_THRESHOLD,
        })
    })
})
