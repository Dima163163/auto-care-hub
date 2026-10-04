import { mockCabinets, mockReviews, mockUsers } from ".././data"
import { autoCareMarkets, autoCareProviders, getMockCommunityProfileState, mockAutoCareServiceRequests, mockFeaturedAutoCareReviews, mockHelpfulVotesByReview } from './mock-fixtures'
import type { MockAutoCareReview } from './mock-fixtures'

export function summarizeMockAutoCareReviews(reviews: readonly MockAutoCareReview[]) {
    const approvedReviews = reviews.filter((review) => (review.status ?? 'approved') === 'approved')
    return {
        rating: approvedReviews.length === 0
            ? 0
            : Number((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length).toFixed(1)),
        reviewCount: approvedReviews.length,
    }
}

export function getMockAutoCareReviewSummary(providerId: string) {
    return summarizeMockAutoCareReviews(getMockPublicAutoCareReviews(providerId))
}

export function getMockPublicAutoCareReviews(providerId: string) {
    const provider = autoCareProviders.find((item) => item.id === providerId)
    if (!provider || provider.status !== 'active' || !autoCareMarkets.some((market) => market.id === provider.location.marketId && market.launchReady && market.countryCode === 'RU')) return []

    const requestsById = new Map(mockAutoCareServiceRequests
        .filter((request) => request.providerId === providerId && request.locationId === provider.location.id)
        .map((request) => [request.id, request]))

    return mockFeaturedAutoCareReviews.filter((review) => {
        if (review.providerId !== providerId || (review.status ?? 'approved') !== 'approved' || !review.verifiedVisit || !review.serviceRequestId) return false
        const request = requestsById.get(review.serviceRequestId)
        return request?.providerId === review.providerId
            && request.status === 'closed'
            && Boolean(request.clientConfirmedAt && request.providerConfirmedAt)
    })
}

export function getMockCommunityMetrics(userId: string) {
    const confirmedVisits = mockAutoCareServiceRequests.filter((request) => request.clientId === userId
        && request.status === 'closed' && Boolean(request.clientConfirmedAt && request.providerConfirmedAt)
        && autoCareProviders.some((provider) => provider.id === request.providerId && provider.status === 'active' && autoCareMarkets.some((market) => market.id === provider.location.marketId && market.launchReady && market.countryCode === 'RU'))).length
    const eligibleReviews = [...new Set(mockFeaturedAutoCareReviews.map((review) => review.providerId))]
        .flatMap((providerId) => getMockPublicAutoCareReviews(providerId))
        .filter((review) => review.clientId === userId)
    const helpfulVoters = new Set(eligibleReviews.flatMap((review) => [...(mockHelpfulVotesByReview.get(review.id) ?? [])]
        .filter((voterId) => mockUsers.some((user) => user.id === voterId && user.role === 'client' && user.status === 'active' && user.emailVerifiedAt))))
    return { confirmedVisits, publishedReviews: eligibleReviews.length, helpfulVoters: helpfulVoters.size }
}

export function getMockCommunityBadges(metrics: ReturnType<typeof getMockCommunityMetrics>) {
    const badges: Array<'verified_client' | 'regular_client' | 'helpful_reviewer' | 'autocare_expert'> = []
    if (metrics.confirmedVisits >= 1) badges.push('verified_client')
    if (metrics.confirmedVisits >= 3) badges.push('regular_client')
    if (metrics.confirmedVisits >= 1 && metrics.publishedReviews >= 3 && metrics.helpfulVoters >= 5) badges.push('helpful_reviewer')
    if (metrics.confirmedVisits >= 5 && metrics.publishedReviews >= 5 && metrics.helpfulVoters >= 15) badges.push('autocare_expert')
    return badges
}

export function getMockHelpfulCount(reviewId: string) {
    return [...(mockHelpfulVotesByReview.get(reviewId) ?? [])].filter((voterId) => mockUsers.some((user) => user.id === voterId && user.role === 'client' && user.status === 'active' && user.emailVerifiedAt)).length
}

export function toMockPublicAutoCareReview(review: MockAutoCareReview) {
    const state = review.clientId ? getMockCommunityProfileState(review.clientId) : null
    const user = review.clientId ? mockUsers.find((candidate) => candidate.id === review.clientId) : undefined
    const optedIn = Boolean(state?.enabled && state.displayName && user?.role === 'client' && user.status === 'active')
    const metrics = review.clientId && optedIn ? getMockCommunityMetrics(review.clientId) : null
    return {
        id: review.id,
        providerId: review.providerId,
        authorName: optedIn ? state!.displayName! : '',
        vehicleLabel: '',
        rating: review.rating,
        text: review.text,
        avatarUrl: optedIn ? user?.avatarUrl ?? null : null,
        photoUrls: review.photoUrls,
        createdAt: review.createdAt,
        serviceSlug: review.serviceSlug ?? null,
        communityProfile: optedIn && metrics ? { profileId: state!.profileId, badgeCodes: getMockCommunityBadges(metrics) } : null,
        helpfulCount: getMockHelpfulCount(review.id),
    }
}

export function toPublicReview(review: typeof mockReviews[number]) {
    return {
        id: review.id,
        cabinetId: review.cabinetId,
        clientId: review.clientId,
        rating: review.rating,
        text: review.text,
        status: review.status,
        createdAt: review.createdAt,
        client: review.client,
    }
}

export function toClientReview(review: typeof mockReviews[number]) {
    const cabinet = mockCabinets.find((item) => item.id === review.cabinetId)

    return {
        ...toPublicReview(review),
        cabinet: {
            id: review.cabinetId,
            title: cabinet?.title ?? review.cabinet?.title ?? 'Unknown cabinet',
        },
    }
}
