import { beforeEach, describe, expect, it } from 'vitest'

import {
    addCompletedOnboardingStep,
    getOnboardingProgressStorageKey,
    readOnboardingProgress,
    writeOnboardingProgress,
} from './onboardingProgress'

describe('onboarding progress', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('keeps progress isolated by role and user', () => {
        const clientKey = getOnboardingProgressStorageKey('user-1', 'client')
        const ownerKey = getOnboardingProgressStorageKey('user-1', 'owner')

        expect(clientKey).not.toBe(ownerKey)

        writeOnboardingProgress(clientKey, ['cabinets'])

        expect(readOnboardingProgress(clientKey)).toEqual(['cabinets'])
        expect(readOnboardingProgress(ownerKey)).toEqual([])
    })

    it('ignores malformed or unsafe stored values', () => {
        const key = getOnboardingProgressStorageKey('user-1', 'client')
        window.localStorage.setItem(key, '{broken')
        expect(readOnboardingProgress(key)).toEqual([])

        window.localStorage.setItem(key, JSON.stringify(['valid', 123, null]))
        expect(readOnboardingProgress(key)).toEqual(['valid'])
    })

    it('does not duplicate completed steps', () => {
        expect(addCompletedOnboardingStep(['first'], 'first')).toEqual(['first'])
        expect(addCompletedOnboardingStep(['first'], 'second')).toEqual(['first', 'second'])
    })
})
