import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { isVerifiedCompletedVisit } from './completed-visit-policy.js'

export type RankingCalibrationSnapshot = {
    providerId: string
    score: number
    computedAt: Date
}

export type RankingCalibrationRequest = {
    providerId: string
    status: ServiceRequestStatus
    completedAt?: Date | null
    clientConfirmedAt: Date | null
    providerConfirmedAt: Date | null
}

export type RankingCalibrationReview = {
    providerId: string
    rating: number
    verifiedVisit: boolean
}

export type RankingCalibrationBucket = {
    label: '0-49' | '50-64' | '65-79' | '80-100'
    providerCount: number
    confirmedVisits: number
    noShowRatePercent: number
    verifiedReviewAverage: number | null
}

export type RankingCalibrationReport = {
    scoredProviders: number
    confirmedVisits: number
    minimumRecommendedSample: number
    readyForCalibration: boolean
    buckets: RankingCalibrationBucket[]
}

const MINIMUM_RECOMMENDED_SAMPLE = 30

const scoreBuckets = [
    { label: '0-49' as const, minimum: 0, maximum: 49.999 },
    { label: '50-64' as const, minimum: 50, maximum: 64.999 },
    { label: '65-79' as const, minimum: 65, maximum: 79.999 },
    { label: '80-100' as const, minimum: 80, maximum: 100 },
]

function percent(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
}

function average(values: readonly number[]) {
    return values.length === 0
        ? null
        : Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2))
}

/**
 * Produces aggregate-only ranking calibration data. It deliberately does not
 * expose customer, request or provider text; administrators use it to assess
 * whether trust-score cohorts correlate with confirmed completed visits and
 * verified review quality before changing a rollout percentage.
 */
export function buildRankingCalibrationReport(input: {
    snapshots: readonly RankingCalibrationSnapshot[]
    requests: readonly RankingCalibrationRequest[]
    reviews: readonly RankingCalibrationReview[]
    minimumRecommendedSample?: number
}): RankingCalibrationReport {
    const latestSnapshotByProvider = new Map<string, RankingCalibrationSnapshot>()
    for (const snapshot of input.snapshots) {
        const current = latestSnapshotByProvider.get(snapshot.providerId)
        if (!current || snapshot.computedAt.getTime() > current.computedAt.getTime()) {
            latestSnapshotByProvider.set(snapshot.providerId, snapshot)
        }
    }

    const latestSnapshots = [...latestSnapshotByProvider.values()]
    const confirmedByProvider = new Map<string, number>()
    const noShowByProvider = new Map<string, number>()
    for (const request of input.requests) {
        if (isVerifiedCompletedVisit(request)) {
            confirmedByProvider.set(request.providerId, (confirmedByProvider.get(request.providerId) ?? 0) + 1)
        }
        if (request.status === ServiceRequestStatus.NoShow) {
            noShowByProvider.set(request.providerId, (noShowByProvider.get(request.providerId) ?? 0) + 1)
        }
    }
    const verifiedRatingsByProvider = new Map<string, number[]>()
    for (const review of input.reviews) {
        if (!review.verifiedVisit) continue
        const ratings = verifiedRatingsByProvider.get(review.providerId) ?? []
        ratings.push(review.rating)
        verifiedRatingsByProvider.set(review.providerId, ratings)
    }

    const buckets = scoreBuckets.map((bucket) => {
        const snapshots = latestSnapshots.filter((snapshot) => snapshot.score >= bucket.minimum && snapshot.score <= bucket.maximum)
        const providerIds = new Set(snapshots.map((snapshot) => snapshot.providerId))
        const confirmedVisits = [...providerIds].reduce((total, providerId) => total + (confirmedByProvider.get(providerId) ?? 0), 0)
        const noShows = [...providerIds].reduce((total, providerId) => total + (noShowByProvider.get(providerId) ?? 0), 0)
        const verifiedRatings = [...providerIds].flatMap((providerId) => verifiedRatingsByProvider.get(providerId) ?? [])
        return {
            label: bucket.label,
            providerCount: providerIds.size,
            confirmedVisits,
            noShowRatePercent: percent(noShows, confirmedVisits + noShows),
            verifiedReviewAverage: average(verifiedRatings),
        }
    })

    const confirmedVisits = [...confirmedByProvider.values()].reduce((total, count) => total + count, 0)
    const minimumRecommendedSample = input.minimumRecommendedSample ?? MINIMUM_RECOMMENDED_SAMPLE
    return {
        scoredProviders: latestSnapshots.length,
        confirmedVisits,
        minimumRecommendedSample,
        readyForCalibration: latestSnapshots.length > 0 && confirmedVisits >= minimumRecommendedSample,
        buckets,
    }
}
