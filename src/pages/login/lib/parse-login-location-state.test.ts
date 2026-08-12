import { describe, expect, it } from 'vitest'

import { parseLoginLocationState } from './parse-login-location-state'

describe('parseLoginLocationState', () => {
    it('keeps only the safe redirect location fields', () => {
        expect(parseLoginLocationState({
            from: {
                pathname: '/cabinets',
                search: '?city=Chisinau',
                hash: '#results',
                state: { secret: 'ignored' },
            },
        })).toEqual({
            from: {
                pathname: '/cabinets',
                search: '?city=Chisinau',
                hash: '#results',
            },
        })
    })

    it('rejects malformed external state without throwing', () => {
        expect(parseLoginLocationState(null)).toEqual({})
        expect(parseLoginLocationState({ from: { pathname: 42 } })).toEqual({})
        expect(parseLoginLocationState({ from: 'https://evil.example' })).toEqual({})
    })
})
