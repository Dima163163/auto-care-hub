import { describe, expect, it } from 'vitest'

import { validateManualBonusGrant } from './manual-bonus-grant'

describe('validateManualBonusGrant', () => {
    it('returns normalized values for a valid grant', () => {
        expect(validateManualBonusGrant('client-1', '120', '  После визита  ')).toEqual({ valid: true, points: 120, reason: 'После визита' })
    })

    it('identifies the first invalid field without producing a partial payload', () => {
        expect(validateManualBonusGrant('', '120', 'Причина')).toEqual({ valid: false, field: 'client' })
        expect(validateManualBonusGrant('client-1', '1.5', 'Причина')).toEqual({ valid: false, field: 'points' })
        expect(validateManualBonusGrant('client-1', '120', 'не')).toEqual({ valid: false, field: 'reason' })
    })

    it('enforces the points and reason limits', () => {
        expect(validateManualBonusGrant('client-1', '0', 'Причина')).toEqual({ valid: false, field: 'points' })
        expect(validateManualBonusGrant('client-1', '100001', 'Причина')).toEqual({ valid: false, field: 'points' })
        expect(validateManualBonusGrant('client-1', '100', 'x'.repeat(241))).toEqual({ valid: false, field: 'reason' })
    })
})
