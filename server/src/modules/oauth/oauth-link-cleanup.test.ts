import { describe, expect, it } from 'vitest'

import { selectExpiredOAuthLinkRequestIds } from './oauth-link-cleanup.js'

describe('expired OAuth link request selection', () => {
    it('returns only the configured number of oldest rows', () => {
        expect(selectExpiredOAuthLinkRequestIds([
            { id: 'first' },
            { id: 'second' },
            { id: 'third' },
        ], 2)).toEqual(['first', 'second'])
    })

    it('rejects unbounded cleanup configuration', () => {
        expect(() => selectExpiredOAuthLinkRequestIds([], 0)).toThrow(/positive/)
    })
})
