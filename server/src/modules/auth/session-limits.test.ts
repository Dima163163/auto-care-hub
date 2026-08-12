import { describe, expect, it } from 'vitest'

import { getSessionListLimit, MAX_SESSIONS_PER_USER } from './session-limits.js'

describe('session response limits', () => {
    it('keeps the session list bound explicit and stable', () => {
        expect(getSessionListLimit()).toBe(MAX_SESSIONS_PER_USER)
        expect(getSessionListLimit()).toBe(100)
    })
})
