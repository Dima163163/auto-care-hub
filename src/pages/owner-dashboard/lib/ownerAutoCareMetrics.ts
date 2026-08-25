import type { AutoCareApiProvider, AutoCareServiceRequest } from '@/entities/automotive-service'

export type OwnerAutoCareMetrics = {
    activeProviders: number
    averageRating: number
    confirmedRequests: number
    conversionRate: number
    estimatedRevenueMinor: number
    needsReply: number
    openRequests: number
}

export function buildOwnerAutoCareMetrics(providers: AutoCareApiProvider[], requests: AutoCareServiceRequest[]): OwnerAutoCareMetrics {
    const confirmed = requests.filter((request) => request.status === 'accepted')
    const ratedProviders = providers.filter((provider) => provider.reviewCount > 0)

    return {
        activeProviders: providers.filter((provider) => provider.status === 'active').length,
        averageRating: ratedProviders.length ? ratedProviders.reduce((total, provider) => total + provider.rating, 0) / ratedProviders.length : 0,
        confirmedRequests: confirmed.length,
        conversionRate: requests.length ? Math.round((confirmed.length / requests.length) * 100) : 0,
        estimatedRevenueMinor: confirmed.reduce((total, request) => total + (request.quote?.amountMinor ?? 0), 0),
        needsReply: requests.filter((request) => ['open', 'awaiting_reply'].includes(request.status)).length,
        openRequests: requests.length,
    }
}
