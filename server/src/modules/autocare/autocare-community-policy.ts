export type AutoCareCommunityBadgeCode =
    | 'verified_client'
    | 'regular_client'
    | 'helpful_reviewer'
    | 'autocare_expert'

export type AutoCareCommunityMetrics = {
    confirmedVisits: number
    publishedReviews: number
    helpfulVoters: number
}

export const AUTOCARE_COMMUNITY_BADGE_THRESHOLDS = {
    verified_client: { confirmedVisits: 1 },
    regular_client: { confirmedVisits: 3 },
    helpful_reviewer: { confirmedVisits: 1, publishedReviews: 3, helpfulVoters: 5 },
    autocare_expert: { confirmedVisits: 5, publishedReviews: 5, helpfulVoters: 15 },
} as const

export function getAutoCareCommunityBadges(metrics: AutoCareCommunityMetrics): AutoCareCommunityBadgeCode[] {
    const badges: AutoCareCommunityBadgeCode[] = []
    if (metrics.confirmedVisits >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.verified_client.confirmedVisits) badges.push('verified_client')
    if (metrics.confirmedVisits >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.regular_client.confirmedVisits) badges.push('regular_client')
    if (metrics.confirmedVisits >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.helpful_reviewer.confirmedVisits
        && metrics.publishedReviews >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.helpful_reviewer.publishedReviews
        && metrics.helpfulVoters >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.helpful_reviewer.helpfulVoters) badges.push('helpful_reviewer')
    if (metrics.confirmedVisits >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.autocare_expert.confirmedVisits
        && metrics.publishedReviews >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.autocare_expert.publishedReviews
        && metrics.helpfulVoters >= AUTOCARE_COMMUNITY_BADGE_THRESHOLDS.autocare_expert.helpfulVoters) badges.push('autocare_expert')
    return badges
}

export function normalizeAutoCareCommunityDisplayName(value: unknown): string | null | undefined {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return undefined
    const normalized = [...value.normalize('NFKC')]
        .map((character) => /\s/u.test(character) ? ' ' : character)
        .filter((character) => {
            const codePoint = character.codePointAt(0) ?? 0
            return codePoint >= 32 && !(codePoint >= 127 && codePoint <= 159)
        })
        .join('')
        .replace(/\s+/gu, ' ')
        .trim()
    if (normalized.length === 0) return null
    const length = [...normalized].length
    return length >= 2 && length <= 40 ? normalized : undefined
}
