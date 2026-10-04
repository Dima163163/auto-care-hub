import { http, HttpResponse } from "msw"
import { mockUsers } from ".././data"
import { currentMockUser } from './mock-access'
import { getMockCommunityProfileState, mockCommunityConsentLedger, mockCommunityProfiles, mockFeaturedAutoCareReviews, mockHelpfulVotesByReview } from './mock-fixtures'
import { getMockCommunityBadges, getMockCommunityMetrics, getMockHelpfulCount, getMockPublicAutoCareReviews } from './mock-reviews'
import { invalidMockBodyResponse } from './mock-validation'
import { allocateMockCommunityProfileId } from './mock-fixtures'

export const communityHandlers = [
{ order: 3, handler: http.get('/api/users/me/community-profile', () => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' || user.status !== 'active') return HttpResponse.json({ message: 'Only active clients can use community profiles.' }, { status: 403 })
        const profile = getMockCommunityProfileState(user.id)
        const metrics = getMockCommunityMetrics(user.id)
        return HttpResponse.json({
            enabled: profile.enabled,
            displayName: profile.displayName,
            publicProfileId: profile.enabled ? profile.profileId : null,
            profileUrl: profile.enabled ? `/community/clients/${profile.profileId}` : null,
            badgeCodes: getMockCommunityBadges(metrics),
            metrics,
        })
    }) },
{ order: 4, handler: http.patch('/api/users/me/community-profile', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' || user.status !== 'active') return HttpResponse.json({ message: 'Only active clients can use community profiles.' }, { status: 403 })
        const body = await request.json() as { enabled?: unknown; displayName?: unknown }
        if ((body.enabled !== undefined && typeof body.enabled !== 'boolean') || (body.displayName !== undefined && body.displayName !== null && typeof body.displayName !== 'string')) return invalidMockBodyResponse()
        if (body.enabled === undefined && body.displayName === undefined) return invalidMockBodyResponse()
        const profile = getMockCommunityProfileState(user.id)
        const normalizedDisplayName = typeof body.displayName === 'string' ? [...body.displayName.normalize('NFKC')]
            .map((character) => /\s/u.test(character) ? ' ' : character)
            .filter((character) => {
                const codePoint = character.codePointAt(0) ?? 0
                return codePoint >= 32 && !(codePoint >= 127 && codePoint <= 159)
            })
            .join('')
            .replace(/\s+/gu, ' ')
            .trim() : body.displayName
        if (typeof normalizedDisplayName === 'string' && normalizedDisplayName.length > 0 && ([...normalizedDisplayName].length < 2 || [...normalizedDisplayName].length > 40)) return HttpResponse.json({ message: 'Display name must contain 2 to 40 visible characters.' }, { status: 422 })
        const displayName = normalizedDisplayName === '' ? null : normalizedDisplayName
        const wasEnabled = profile.enabled
        const nextDisplayName = body.displayName === undefined ? profile.displayName : displayName
        const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : profile.enabled
        if (nextEnabled && !nextDisplayName?.trim()) return HttpResponse.json({ message: 'Choose a public display name before enabling the community profile.' }, { status: 422 })
        if (body.displayName !== undefined) profile.displayName = typeof displayName === 'string' ? displayName : null
        if (typeof body.enabled === 'boolean') profile.enabled = body.enabled
        if (body.enabled === true && !wasEnabled) profile.profileId = `10000000-0000-4000-8000-${String(allocateMockCommunityProfileId()).padStart(12, '0')}`
        if (body.enabled !== undefined && body.enabled !== wasEnabled) mockCommunityConsentLedger.push({ userId: user.id, action: body.enabled ? 'granted' : 'revoked', at: new Date().toISOString() })
        const metrics = getMockCommunityMetrics(user.id)
        return HttpResponse.json({ enabled: profile.enabled, displayName: profile.displayName, publicProfileId: profile.enabled ? profile.profileId : null, profileUrl: profile.enabled ? `/community/clients/${profile.profileId}` : null, badgeCodes: getMockCommunityBadges(metrics), metrics })
    }) },
{ order: 5, handler: http.get('/api/v1/community/clients/:profileId', ({ params }) => {
        const entry = [...mockCommunityProfiles.entries()].find(([, profile]) => profile.profileId === String(params.profileId) && profile.enabled && Boolean(profile.displayName))
        const user = entry ? mockUsers.find((candidate) => candidate.id === entry[0] && candidate.role === 'client' && candidate.status === 'active') : undefined
        if (!entry || !user) return HttpResponse.json({ message: 'Public client profile not found.' }, { status: 404, headers: { 'x-robots-tag': 'noindex, nofollow' } })
        const metrics = getMockCommunityMetrics(user.id)
        return HttpResponse.json({ profileId: entry[1].profileId, displayName: entry[1].displayName, avatarUrl: user.avatarUrl, badgeCodes: getMockCommunityBadges(metrics), metrics }, { headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } })
    }) },
{ order: 6, handler: http.get('/api/v1/autocare-reviews/helpful/my', ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' || user.status !== 'active' || !user.emailVerifiedAt) return HttpResponse.json({ message: 'Email-verified active clients can view helpful votes.' }, { status: 403 })
        const providerId = new URL(request.url).searchParams.get('providerId')
        if (!providerId) return invalidMockBodyResponse()
        const reviews = getMockPublicAutoCareReviews(providerId)
        return HttpResponse.json({
            reviewIds: reviews.filter((review) => mockHelpfulVotesByReview.get(review.id)?.has(user.id)).map((review) => review.id),
            ownReviewIds: reviews.filter((review) => review.clientId === user.id).map((review) => review.id),
        }, { headers: { 'cache-control': 'no-store' } })
    }) },
{ order: 7, handler: http.put('/api/v1/autocare-reviews/:reviewId/helpful', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' || user.status !== 'active' || !user.emailVerifiedAt) return HttpResponse.json({ message: 'Email-verified active clients can vote.' }, { status: 403 })
        const review = [...new Set(mockFeaturedAutoCareReviews.map((item) => item.providerId))].flatMap((providerId) => getMockPublicAutoCareReviews(providerId)).find((item) => item.id === String(params.reviewId))
        if (!review) return HttpResponse.json({ message: 'Review not found.' }, { status: 404 })
        if (review.clientId === user.id) return HttpResponse.json({ message: 'You cannot vote for your own review.' }, { status: 403 })
        const voters = mockHelpfulVotesByReview.get(review.id) ?? new Set<string>()
        voters.add(user.id)
        mockHelpfulVotesByReview.set(review.id, voters)
        return HttpResponse.json({ reviewId: review.id, providerId: review.providerId, helpfulCount: getMockHelpfulCount(review.id), voted: true }, { headers: { 'cache-control': 'no-store' } })
    }) },
{ order: 8, handler: http.delete('/api/v1/autocare-reviews/:reviewId/helpful', ({ params }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client' || user.status !== 'active' || !user.emailVerifiedAt) return HttpResponse.json({ message: 'Email-verified active clients can vote.' }, { status: 403 })
        const review = [...new Set(mockFeaturedAutoCareReviews.map((item) => item.providerId))].flatMap((providerId) => getMockPublicAutoCareReviews(providerId)).find((item) => item.id === String(params.reviewId))
        if (!review) return HttpResponse.json({ message: 'Review not found.' }, { status: 404 })
        mockHelpfulVotesByReview.get(review.id)?.delete(user.id)
        return HttpResponse.json({ reviewId: review.id, providerId: review.providerId, helpfulCount: getMockHelpfulCount(review.id), voted: false }, { headers: { 'cache-control': 'no-store' } })
    }) }
]
