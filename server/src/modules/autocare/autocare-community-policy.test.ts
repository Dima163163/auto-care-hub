import { describe, expect, it } from 'vitest'

import { getAutoCareCommunityBadges, normalizeAutoCareCommunityDisplayName } from './autocare-community-policy.js'

describe('AutoCare community badge policy', () => {
    it('awards only badges backed by confirmed visits, published verified reviews and distinct helpful voters', () => {
        expect(getAutoCareCommunityBadges({ confirmedVisits: 0, publishedReviews: 20, helpfulVoters: 100 })).toEqual([])
        expect(getAutoCareCommunityBadges({ confirmedVisits: 1, publishedReviews: 0, helpfulVoters: 0 })).toEqual(['verified_client'])
        expect(getAutoCareCommunityBadges({ confirmedVisits: 3, publishedReviews: 2, helpfulVoters: 4 })).toEqual(['verified_client', 'regular_client'])
        expect(getAutoCareCommunityBadges({ confirmedVisits: 5, publishedReviews: 5, helpfulVoters: 15 })).toEqual(['verified_client', 'regular_client', 'helpful_reviewer', 'autocare_expert'])
    })

    it('normalizes aliases, accepts clearing, and rejects names outside the safe length bounds', () => {
        expect(normalizeAutoCareCommunityDisplayName('  Alex\tDriver  ')).toBe('Alex Driver')
        expect(normalizeAutoCareCommunityDisplayName('')).toBeNull()
        expect(normalizeAutoCareCommunityDisplayName('A')).toBeUndefined()
        expect(normalizeAutoCareCommunityDisplayName('x'.repeat(41))).toBeUndefined()
        expect(normalizeAutoCareCommunityDisplayName(42)).toBeUndefined()
    })
})
