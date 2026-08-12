import { describe, expect, it } from 'vitest'

import { shouldShowMockLoginGuidance } from './should-show-mock-login-guidance'

describe('shouldShowMockLoginGuidance', () => {
    it('shows demo guidance only in mock mode', () => {
        expect(shouldShowMockLoginGuidance('mock')).toBe(true)
        expect(shouldShowMockLoginGuidance('real')).toBe(false)
    })
})
