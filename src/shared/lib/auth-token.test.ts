import { afterEach, describe, expect, it } from 'vitest'

import { clearAccessToken, getAccessToken, getAuthGeneration, setAccessToken } from './auth-token'

describe('auth token lifecycle generation', () => {
    afterEach(() => {
        clearAccessToken()
    })

    it('invalidates a refresh generation when local credentials are cleared', () => {
        setAccessToken('old-token')
        const generation = getAuthGeneration()

        clearAccessToken()

        expect(getAccessToken()).toBeNull()
        expect(getAuthGeneration()).toBe(generation + 1)
    })

    it('does not change generation for a normal token replacement', () => {
        const generation = getAuthGeneration()

        setAccessToken('new-token')

        expect(getAuthGeneration()).toBe(generation)
    })
})
