import { http, HttpResponse } from "msw"
import { type AutoCareApiProvider } from "@/entities/automotive-service"
import { mockUsers } from ".././data"
import { mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, hasMockSuperAdminAccess } from './mock-access'
import { autoCareMarket, autoCareProviders, mockAdminAutoCareModerationEvidence, mockAutoCareAppeals, mockAutoCareChatBlocks, mockAutoCareChatReports, mockAutoCareProviderChangeRequests, mockAutoCareServiceRequests, mockFeaturedAutoCareReviews, mockSuperAdminTrustPolicy, ownerAutoCareProviders } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const governanceHandlers = [
{ order: 196, handler: http.get('/api/admin/autocare-providers', () => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const providers: AutoCareApiProvider[] = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        return HttpResponse.json(providers.map((provider) => ({ ...provider, ownerName: 'Demo Owner', trustScore: Math.min(100, Math.round((provider.verified ? 30 : 0) + provider.rating * 9 + Math.min(provider.reviewCount, 40) / 2 + Math.min(provider.yearsActive, 10))) })))
    }) },
{ order: 197, handler: http.patch('/api/admin/autocare-providers/:id/status', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: 'draft' | 'active' | 'suspended' }
        if (!body.status || !['draft', 'active', 'suspended'].includes(body.status)) return invalidMockBodyResponse()
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === params.id)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })
        provider.status = body.status
        return HttpResponse.json({ ...provider, ownerName: 'Demo Owner', trustScore: Math.min(100, Math.round((provider.verified ? 30 : 0) + provider.rating * 9 + Math.min(provider.reviewCount, 40) / 2 + Math.min(provider.yearsActive, 10))) })
    }) },
{ order: 198, handler: http.get('/api/admin/autocare-provider-change-requests', ({ request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const query = new URL(request.url).searchParams
        const status = query.get('status')
        const kind = query.get('kind')
        return HttpResponse.json(mockAutoCareProviderChangeRequests.filter((item) => (!status || item.status === status) && (!kind || item.kind === kind)))
    }) },
{ order: 199, handler: http.patch('/api/admin/autocare-provider-change-requests/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if (body.status !== 'approved' && body.status !== 'rejected') return invalidMockBodyResponse()
        const changeRequest = mockAutoCareProviderChangeRequests.find((item) => item.id === params.id)
        if (!changeRequest) return HttpResponse.json({ message: 'Provider change request not found.' }, { status: 404 })
        if (changeRequest.status !== 'pending') return HttpResponse.json({ message: 'Provider change request has already been decided.' }, { status: 409 })
        if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') return invalidMockBodyResponse()
        const provider = [...autoCareProviders, ...ownerAutoCareProviders].find((item) => item.id === changeRequest.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive provider not found.' }, { status: 404 })
        if (body.status === 'approved') {
            if (changeRequest.kind === 'verification') { provider.verified = true; if (provider.status === 'draft') provider.status = 'active' }
            else Object.assign(provider, changeRequest.payload)
        }
        changeRequest.status = body.status
        changeRequest.reviewedById = user.id
        changeRequest.reviewReason = typeof body.reason === 'string' ? body.reason.trim() || null : null
        changeRequest.reviewedAt = new Date().toISOString()
        changeRequest.updatedAt = changeRequest.reviewedAt
        return HttpResponse.json(changeRequest)
    }) },
{ order: 202, handler: http.get('/api/admin/autocare-moderation-evidence', ({ request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const status = new URL(request.url).searchParams.get('status')
        return HttpResponse.json(mockAdminAutoCareModerationEvidence.filter((item) => !status || item.status === status))
    }) },
{ order: 203, handler: http.patch('/api/admin/autocare-moderation-evidence/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const evidence = mockAdminAutoCareModerationEvidence.find((item) => item.id === params.id)
        if (!evidence) return HttpResponse.json({ message: 'Moderation evidence not found.' }, { status: 404 })
        if (evidence.status !== 'pending') return HttpResponse.json({ message: 'Moderation evidence has already been decided.' }, { status: 409 })
        const body = await request.json() as { status?: unknown; reason?: unknown }
        if ((body.status !== 'approved' && body.status !== 'rejected') || typeof body.reason !== 'string' || body.reason.trim().length === 0) return invalidMockBodyResponse()
        evidence.status = body.status
        evidence.notes = body.reason.trim()
        evidence.verifiedAt = new Date().toISOString()
        if (evidence.review) evidence.review.status = body.status
        return HttpResponse.json(evidence)
    }) },
{ order: 208, handler: http.get('/api/admin/autocare-quality-monitoring', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const providers: AutoCareApiProvider[] = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        const reviews = mockFeaturedAutoCareReviews
        const reviewSamples = reviews.map((review) => ({ clientId: review.clientId ?? null, providerId: review.providerId, serviceRequestId: review.serviceRequestId ?? null, text: review.text, rating: review.rating, createdAt: new Date(review.createdAt) }))
        const anomalyCandidates = reviewSamples.reduce((count, review, index) => {
            const normalized = review.text.trim().toLocaleLowerCase()
            return count + (reviewSamples.slice(index + 1).some((candidate) => candidate.providerId === review.providerId && candidate.clientId === review.clientId && candidate.text.trim().toLocaleLowerCase() === normalized) ? 1 : 0)
        }, 0)
        const completed = mockAutoCareServiceRequests.filter((request) => request.status === 'closed').length
        const cancelled = mockAutoCareServiceRequests.filter((request) => request.status === 'cancelled').length
        const noShows = mockAutoCareServiceRequests.filter((request) => request.status === 'no_show').length
        const reassessedProviders = providers.filter((provider) => provider.trustReassessedAt).length
        return HttpResponse.json({
            generatedAt: new Date().toISOString(),
            providers: { total: providers.length, active: providers.filter((provider) => provider.status === 'active').length, verified: providers.filter((provider) => provider.verified).length, trusted: providers.filter((provider) => provider.trustBadge === 'trusted').length, suspended: providers.filter((provider) => provider.status === 'suspended').length },
            reviews: { approved: reviews.filter((review) => review.status !== 'pending' && review.status !== 'rejected').length, pending: reviews.filter((review) => review.status === 'pending').length, rejected: reviews.filter((review) => review.status === 'rejected').length, anomalyCandidates },
            requests: { total: mockAutoCareServiceRequests.length, completed, cancelled, noShows },
            ranking: { trustSnapshots: reassessedProviders, reassessedProviders, evidenceCoveragePercent: providers.length === 0 ? 0 : Number(((reassessedProviders / providers.length) * 100).toFixed(1)) },
            catalog: { activeDefinitions: 18, activeOffers: providers.length * 4, providersWithOffers: providers.length, offerCoveragePercent: providers.length === 0 ? 0 : 100, offersWithDescription: providers.length * 4, offersWithPrice: providers.length * 4, priceCoveragePercent: 100 },
            supply: { activeMarkets: 1, averageLocationsPerProvider: 1, markets: [{ marketId: 'market-moscow', providers: providers.length, locations: providers.length, activeOffers: providers.length * 4 }] },
            reliability: { responseSamples: mockAutoCareServiceRequests.length, averageResponseMinutes: 18, p95ResponseMinutes: 42, confirmedBookings: completed, confirmationSamples: mockAutoCareServiceRequests.length, confirmationReliabilityPercent: mockAutoCareServiceRequests.length === 0 ? 0 : Number(((completed / mockAutoCareServiceRequests.length) * 100).toFixed(1)), bookingConflicts: cancelled + noShows },
            appeals: { available: true, pending: 2 },
        })
    }) },
{ order: 212, handler: http.get('/api/admin/autocare-appeals', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const params = new URL(request.url).searchParams
        return HttpResponse.json(mockAutoCareAppeals.filter((appeal) => (!params.get('status') || appeal.status === params.get('status')) && (!params.get('subject') || appeal.subject === params.get('subject'))))
    }) },
{ order: 213, handler: http.patch('/api/admin/autocare-appeals/:id/decision', async ({ params, request }) => {
        const user = currentMockUser()
        if (!user || !['admin', 'super_admin'].includes(user.role)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const appeal = mockAutoCareAppeals.find((item) => item.id === params.id)
        if (!appeal) return HttpResponse.json({ message: 'Appeal not found.' }, { status: 404 })
        const body = await request.json() as { status?: 'accepted' | 'rejected'; reason?: string }
        if (appeal.status !== 'pending' || !body.status || !body.reason?.trim()) return HttpResponse.json({ message: 'Appeal decision is invalid.' }, { status: 409 })
        const chatRestrictionBlock = appeal.subject === 'chat_restriction' && body.status === 'accepted'
            ? mockAutoCareChatBlocks.find((candidate) => candidate.id === appeal.subjectId && candidate.blockedUserId === appeal.submittedById && candidate.sourceReportId)
            : undefined
        if (appeal.subject === 'chat_restriction' && body.status === 'accepted' && !chatRestrictionBlock) return HttpResponse.json({ message: 'The appealed chat restriction is no longer available.' }, { status: 409 })
        appeal.status = body.status
        appeal.decisionReason = body.reason.trim()
        appeal.decidedById = user.id
        appeal.decidedAt = new Date().toISOString()
        if (chatRestrictionBlock) {
            chatRestrictionBlock.status = 'revoked'
            chatRestrictionBlock.revokedAt = appeal.decidedAt
            const sourceReport = mockAutoCareChatReports.find((report) => report.id === chatRestrictionBlock.sourceReportId)
            if (sourceReport) sourceReport.overturnedAt = appeal.decidedAt
        }
        return HttpResponse.json(appeal)
    }) },
{ order: 214, handler: http.get('/api/super-admin/platform-overview', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || user.role !== 'super_admin') return HttpResponse.json({ message: 'Only super admin can use this endpoint.' }, { status: 403 })
        const providers = [...new Map([...autoCareProviders, ...ownerAutoCareProviders].map((provider) => [provider.id, provider])).values()]
        return HttpResponse.json({ markets: [autoCareMarket], providers: { total: providers.length, active: providers.filter((provider) => provider.status === 'active').length, draft: providers.filter((provider) => provider.status === 'draft').length, suspended: providers.filter((provider) => provider.status === 'suspended').length, verified: providers.filter((provider) => provider.verified).length }, users: { clients: mockUsers.filter((item) => item.role === 'client').length, owners: mockUsers.filter((item) => item.role === 'owner').length, admins: mockUsers.filter((item) => item.role === 'admin').length, superAdmins: mockUsers.filter((item) => item.role === 'super_admin').length } })
    }) },
{ order: 215, handler: http.get('/api/super-admin/trust-policy', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ message: 'Only super admin can manage trust policy.' }, { status: 403 })
        return HttpResponse.json(mockSuperAdminTrustPolicy)
    }) },
{ order: 216, handler: http.patch('/api/super-admin/trust-policy', async ({ request }) => {
        if (!hasMockSuperAdminAccess()) return HttpResponse.json({ message: 'Only super admin can manage trust policy.' }, { status: 403 })
        const body = await request.json() as Partial<typeof mockSuperAdminTrustPolicy>
        if (typeof body.policyVersion !== 'string' || typeof body.trustedMinimumRating !== 'number' || typeof body.trustedMinimumReviews !== 'number' || typeof body.trustedMinimumCompletedVisits !== 'number' || typeof body.trustedMaxNoShowRate !== 'number' || typeof body.trustedMaxComplaintRate !== 'number' || typeof body.trustedMaxResponseTimeMinutes !== 'number' || typeof body.reassessmentIntervalHours !== 'number' || !body.rollout || typeof body.rollout.enabled !== 'boolean' || !Array.isArray(body.rollout.marketIds) || typeof body.rollout.percentage !== 'number') return invalidMockBodyResponse()
        Object.assign(mockSuperAdminTrustPolicy, {
            policyVersion: body.policyVersion,
            trustedMinimumRating: body.trustedMinimumRating,
            trustedMinimumReviews: body.trustedMinimumReviews,
            trustedMinimumCompletedVisits: body.trustedMinimumCompletedVisits,
            trustedMaxNoShowRate: body.trustedMaxNoShowRate,
            trustedMaxComplaintRate: body.trustedMaxComplaintRate,
            trustedMaxResponseTimeMinutes: body.trustedMaxResponseTimeMinutes,
            reassessmentIntervalHours: body.reassessmentIntervalHours,
            rollout: { enabled: body.rollout.enabled, marketIds: [...body.rollout.marketIds], percentage: body.rollout.percentage },
            updatedAt: new Date().toISOString(),
        })
        return HttpResponse.json(mockSuperAdminTrustPolicy)
    }) }
]
