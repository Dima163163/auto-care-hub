import type { AutoCareApiProvider } from './providers.types'

export type DeleteSuperAdminResourceResponse = { id: string }

export type AdminAutoCareProvider = AutoCareApiProvider & {
    ownerName: string | null
    trustScore: number
}

export type SuperAdminPlatformOverview = {
    markets: Array<{ id: string; countryCode: string; countryName: string; cityCode: string; cityName: string; currencyCode: string; launchReady: boolean; supportedLocales: string[] }>
    providers: { total: number; active: number; draft: number; suspended: number; verified: number }
    users: { clients: number; owners: number; admins: number; superAdmins: number }
}

export type AutoCareQualityMonitoring = {
    generatedAt: string
    providers: { total: number; active: number; verified: number; trusted: number; suspended: number }
    reviews: { approved: number; pending: number; rejected: number; anomalyCandidates: number }
    requests: { total: number; completed: number; cancelled: number; noShows: number }
    ranking: {
        trustSnapshots: number
        reassessedProviders: number
        evidenceCoveragePercent: number
        calibration?: {
            scoredProviders: number
            confirmedVisits: number
            minimumRecommendedSample: number
            readyForCalibration: boolean
            buckets: Array<{ label: string; providerCount: number; confirmedVisits: number; noShowRatePercent: number; verifiedReviewAverage: number | null }>
        }
        rollout?: { enabled: boolean; marketIds: string[]; percentage: number }
    }
    catalog: { activeDefinitions: number; activeOffers: number; providersWithOffers: number; offerCoveragePercent: number; offersWithDescription: number; offersWithPrice: number; priceCoveragePercent: number }
    supply: { activeMarkets: number; averageLocationsPerProvider: number; markets: Array<{ marketId: string; providers: number; locations: number; activeOffers: number }> }
    reliability: { responseSamples: number; averageResponseMinutes: number | null; p95ResponseMinutes: number | null; confirmedBookings: number; confirmationSamples: number; confirmationReliabilityPercent: number; bookingConflicts: number }
    appeals: { available: true; pending: number }
}

export type SuperAdminTrustPolicy = {
    policyVersion: string
    trustedMinimumRating: number
    trustedMinimumReviews: number
    trustedMinimumCompletedVisits: number
    trustedMaxNoShowRate: number
    trustedMaxComplaintRate: number
    trustedMaxResponseTimeMinutes: number
    reassessmentIntervalHours: number
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
    updatedAt: string | null
}

export type UpdateSuperAdminTrustPolicyInput = Omit<SuperAdminTrustPolicy, 'updatedAt'>

export type AutoCareAppeal = { id: string; subject: 'provider' | 'review' | 'suspension' | 'catalog' | 'chat_restriction'; subjectId: string; submittedById: string; providerId: string | null; reason: string; evidenceIds: string[]; status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'; decidedById: string | null; decisionReason: string | null; createdAt: string; decidedAt: string | null }

export type CreateAutoCareAppealInput = { subject: AutoCareAppeal['subject']; subjectId: string; providerId?: string | null; reason: string; evidenceIds?: string[] }

export type AdminAutoCareModerationEvidence = {
    id: string
    providerId: string
    kind: 'provider_cover' | 'provider_gallery' | 'provider_document' | 'registration_document' | 'review'
    label: string
    status: 'pending' | 'approved' | 'rejected'
    reference: string | null
    notes: string | null
    expiresAt: string | null
    createdAt: string
    verifiedAt: string | null
    provider: { id: string; name: string; address: string | null }
    review: {
        id: string
        authorName: string
        vehicleLabel: string
        rating: number
        text: string
        photoUrls: string[]
        createdAt: string
        status: 'pending' | 'approved' | 'rejected'
    } | null
}

export type AutoCarePriceBenchmark = { serviceDefinitionId: string; serviceSlug: string; marketId: string | null; makeId: string | null; modelId: string | null; minPriceMinor: number; medianPriceMinor: number; maxPriceMinor: number; currencyCode: string; methodology: Record<string, unknown>; source: string; generatedAt: string }

export type AutoCareTrustEvidence = { id: string; providerId: string; kind: string; label: string; status: string; expiresAt: string | null; verifiedAt: string | null }

export type AutoCareTrustSnapshot = { id: string; providerId: string; locationId: string; policyVersion: string; score: number; badge: string | null; computedAt: string; validUntil: string; inputCounters: Record<string, number>; reasonCodes: string[] }

export type AutoCareTrustResponse = {
    providerId: string
    score: number
    badge: string | null
    reassessedAt: string | null
    evidence: AutoCareTrustEvidence[]
    snapshots: AutoCareTrustSnapshot[]
    explanation?: string
    factors?: { profile: number; reviews: number; evidence: number; reliability: number; claimsPenalty: number }
}
