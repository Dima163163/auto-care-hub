import { describe, expect, it } from 'vitest'

import { getAuditActionLabel, getAuditTargetTypeLabel } from './admin-labels'

describe('admin labels', () => {
    it('translates known audit actions and preserves extensible unknown codes', () => {
        const translate = (key: string) => `translated:${key}`

        expect(getAuditActionLabel('login_failed', translate)).toBe(
            'translated:adminAuditLogs.actions.login_failed',
        )
        expect(getAuditActionLabel('future_security_action', translate)).toBe(
            'future_security_action',
        )
    })

    it('translates known target types and preserves extensible unknown codes', () => {
        const translate = (key: string) => `translated:${key}`

        expect(getAuditTargetTypeLabel('security_event', translate)).toBe(
            'translated:adminAuditLogs.targetTypes.security_event',
        )
        expect(getAuditTargetTypeLabel('future_target', translate)).toBe('future_target')
        expect(getAuditTargetTypeLabel(null, translate)).toBe('')
    })
})
