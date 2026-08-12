import { describe, expect, it } from 'vitest'

import { assertMailModeAllowed } from './mail-config-policy.js'

describe('mail configuration policy', () => {
    it('rejects the logger transport in production', () => {
        expect(() => assertMailModeAllowed('production', 'logger')).toThrow(
            'MAIL_MODE=logger is not allowed in production.',
        )
    })

    it('allows the logger transport outside production', () => {
        expect(() => assertMailModeAllowed('development', 'logger')).not.toThrow()
        expect(() => assertMailModeAllowed('test', 'logger')).not.toThrow()
    })
})
