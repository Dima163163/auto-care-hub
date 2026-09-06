import { afterEach, describe, expect, it } from 'vitest'

import { clearAccessToken, getAccessToken, getAuthGeneration, hasAuthSessionHint, setAccessToken } from './auth-token'

describe('auth token lifecycle generation', () => {
    afterEach(() => {
        clearAccessToken()
        window.localStorage.clear()
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

    it('keeps only a non-secret session hint across document reloads', () => {
        expect(hasAuthSessionHint()).toBe(false)

        setAccessToken('new-token')

        expect(hasAuthSessionHint()).toBe(true)
        expect(window.localStorage.getItem('autocare-auth-session')).toBe('1')

        clearAccessToken()

        expect(hasAuthSessionHint()).toBe(false)
    })
})
