import { z } from 'zod'
import type { AdminAutoCareModerationEvidence, SuperAdminTrustPolicy } from './governance.types'
import { autoCareProviderSchema } from './providers.schemas'

export const autoCarePriceBenchmarkSchema = z.object({ serviceDefinitionId: z.string(), serviceSlug: z.string(), marketId: z.string().nullable(), makeId: z.string().nullable(), modelId: z.string().nullable(), minPriceMinor: z.number().finite(), medianPriceMinor: z.number().finite(), maxPriceMinor: z.number().finite(), currencyCode: z.string(), methodology: z.record(z.string(), z.unknown()), source: z.string(), generatedAt: z.string() }).passthrough()

const autoCareTrustEvidenceSchema = z.object({ id: z.string(), providerId: z.string(), kind: z.string(), label: z.string(), status: z.string(), expiresAt: z.string().nullable(), verifiedAt: z.string().nullable() }).passthrough()

const autoCareTrustSnapshotSchema = z.object({
    id: z.string(), providerId: z.string(), locationId: z.string(), policyVersion: z.string(),
    score: z.number().finite(), badge: z.string().nullable(), computedAt: z.string(), validUntil: z.string(),
    inputCounters: z.record(z.string(), z.number().finite()), reasonCodes: z.array(z.string()),
}).passthrough()

export const autoCareTrustSchema = z.object({
    providerId: z.string(),
    score: z.number().finite(),
    badge: z.string().nullable(),
    reassessedAt: z.string().nullable(),
    evidence: z.array(autoCareTrustEvidenceSchema),
    snapshots: z.array(autoCareTrustSnapshotSchema).default([]),
    factors: z.object({
        profile: z.number().finite(),
        reviews: z.number().finite(),
        evidence: z.number().finite(),
        reliability: z.number().finite(),
        claimsPenalty: z.number().finite(),
    }).optional(),
}).passthrough()

export const adminProviderSchema = autoCareProviderSchema.extend({ ownerName: z.string().nullable(), trustScore: z.number().finite() }).passthrough()

export const platformOverviewSchema = z.object({ markets: z.array(z.object({ id: z.string(), countryCode: z.string(), countryName: z.string(), cityCode: z.string(), cityName: z.string(), currencyCode: z.string(), launchReady: z.boolean(), supportedLocales: z.array(z.string()) }).passthrough()), providers: z.object({ total: z.number().int().nonnegative(), active: z.number().int().nonnegative(), draft: z.number().int().nonnegative(), suspended: z.number().int().nonnegative(), verified: z.number().int().nonnegative() }).passthrough(), users: z.object({ clients: z.number().int().nonnegative(), owners: z.number().int().nonnegative(), admins: z.number().int().nonnegative(), superAdmins: z.number().int().nonnegative() }).passthrough() }).passthrough()

export const autoCareQualityMonitoringSchema = z.object({ generatedAt: z.string(), providers: z.object({ total: z.number().int().nonnegative(), active: z.number().int().nonnegative(), verified: z.number().int().nonnegative(), trusted: z.number().int().nonnegative(), suspended: z.number().int().nonnegative() }), reviews: z.object({ approved: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), rejected: z.number().int().nonnegative(), anomalyCandidates: z.number().int().nonnegative() }), requests: z.object({ total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative(), noShows: z.number().int().nonnegative() }), ranking: z.object({ trustSnapshots: z.number().int().nonnegative(), reassessedProviders: z.number().int().nonnegative(), evidenceCoveragePercent: z.number().nonnegative(), calibration: z.object({ scoredProviders: z.number().int().nonnegative(), confirmedVisits: z.number().int().nonnegative(), minimumRecommendedSample: z.number().int().nonnegative(), readyForCalibration: z.boolean(), buckets: z.array(z.object({ label: z.string(), providerCount: z.number().int().nonnegative(), confirmedVisits: z.number().int().nonnegative(), noShowRatePercent: z.number().nonnegative(), verifiedReviewAverage: z.number().nullable() })) }).optional(), rollout: z.object({ enabled: z.boolean(), marketIds: z.array(z.string()), percentage: z.number().int().min(0).max(100) }).optional() }), catalog: z.object({ activeDefinitions: z.number().int().nonnegative(), activeOffers: z.number().int().nonnegative(), providersWithOffers: z.number().int().nonnegative(), offerCoveragePercent: z.number().nonnegative(), offersWithDescription: z.number().int().nonnegative(), offersWithPrice: z.number().int().nonnegative(), priceCoveragePercent: z.number().nonnegative() }), supply: z.object({ activeMarkets: z.number().int().nonnegative(), averageLocationsPerProvider: z.number().nonnegative(), markets: z.array(z.object({ marketId: z.string(), providers: z.number().int().nonnegative(), locations: z.number().int().nonnegative(), activeOffers: z.number().int().nonnegative() })) }), reliability: z.object({ responseSamples: z.number().int().nonnegative(), averageResponseMinutes: z.number().nullable(), p95ResponseMinutes: z.number().nullable(), confirmedBookings: z.number().int().nonnegative(), confirmationSamples: z.number().int().nonnegative(), confirmationReliabilityPercent: z.number().nonnegative(), bookingConflicts: z.number().int().nonnegative() }), appeals: z.object({ available: z.literal(true), pending: z.number().int().nonnegative() }) })

export const superAdminTrustPolicySchema = z.object({ policyVersion: z.string(), trustedMinimumRating: z.number(), trustedMinimumReviews: z.number().int(), trustedMinimumCompletedVisits: z.number().int(), trustedMaxNoShowRate: z.number(), trustedMaxComplaintRate: z.number(), trustedMaxResponseTimeMinutes: z.number().int(), reassessmentIntervalHours: z.number().int(), rollout: z.object({ enabled: z.boolean(), marketIds: z.array(z.string()), percentage: z.number().int() }), updatedAt: z.string().nullable() }).passthrough() satisfies z.ZodType<SuperAdminTrustPolicy>

export const autoCareAppealSchema = z.object({ id: z.string(), subject: z.enum(['provider', 'review', 'suspension', 'catalog', 'chat_restriction']), subjectId: z.string(), submittedById: z.string(), providerId: z.string().nullable(), reason: z.string(), evidenceIds: z.array(z.string()), status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']), decidedById: z.string().nullable(), decisionReason: z.string().nullable(), createdAt: z.string(), decidedAt: z.string().nullable() }).passthrough()

export const autoCareAppealsSchema = z.array(autoCareAppealSchema)

export const adminAutoCareModerationEvidenceSchema = z.object({
    id: z.string(), providerId: z.string(), kind: z.enum(['provider_cover', 'provider_gallery', 'provider_document', 'registration_document', 'review']), label: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']), reference: z.string().nullable(), notes: z.string().nullable(),
    expiresAt: z.string().nullable(), createdAt: z.string(), verifiedAt: z.string().nullable(),
    provider: z.object({ id: z.string(), name: z.string(), address: z.string().nullable() }),
    review: z.object({ id: z.string(), authorName: z.string(), vehicleLabel: z.string(), rating: z.number().int().min(1).max(5), text: z.string(), photoUrls: z.array(z.string()), createdAt: z.string(), status: z.enum(['pending', 'approved', 'rejected']) }).nullable(),
}).passthrough() satisfies z.ZodType<AdminAutoCareModerationEvidence>

export const adminAutoCareModerationEvidenceListSchema = z.array(adminAutoCareModerationEvidenceSchema)
