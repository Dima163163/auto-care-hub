import { In } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBonusAccountEntity,
    AutoCareServiceQuoteEntity,
    AutomotiveProviderEntity,
    AutomotiveReviewEntity,
    AutomotiveReviewStatus,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { canManageProvider } from './provider-access.service.js'
import type { AutoCareProviderAnalyticsResponse } from './autocare.types.js'

function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

function percent(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1))
}

/**
 * Provider-safe operational metrics. The query is deliberately derived from
 * requests, quotes, messages, reviews and bonus accounts rather than exposing
 * client identity or private message content.
 */
export async function getOwnerAutoCareProviderAnalytics(owner: UserEntity, providerId: string): Promise<AutoCareProviderAnalyticsResponse> {
    if (owner.role !== UserRole.Owner) forbidden('Only service owners can view automotive analytics.')
    if (!(await canManageProvider(owner.id, providerId))) forbidden('You do not manage this automotive service.')

    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
    if (!provider) notFound('Automotive service not found.')

    const [requests, quotes, reviews, accounts] = await Promise.all([
        AppDataSource.getRepository(ServiceRequestEntity).find({ where: { providerId }, order: { createdAt: 'ASC' } }),
        AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({ where: { providerId } }),
        AppDataSource.getRepository(AutomotiveReviewEntity).find({ where: { providerId, status: AutomotiveReviewStatus.Approved } }),
        AppDataSource.getRepository(AutoCareBonusAccountEntity).find({ where: { providerId }, select: { balancePoints: true } }),
    ])

    const requestIds = requests.map((request) => request.id)
    const messages = requestIds.length === 0
        ? []
        : await AppDataSource.getRepository(ServiceMessageEntity).find({ where: { requestId: In(requestIds) }, order: { createdAt: 'ASC' } })
    const clientByRequest = new Map(requests.map((request) => [request.id, request.clientId]))
    const firstProviderMessage = new Map<string, Date>()
    for (const message of messages) {
        if (message.requestId && message.senderId !== clientByRequest.get(message.requestId) && !firstProviderMessage.has(message.requestId)) {
            firstProviderMessage.set(message.requestId, message.createdAt)
        }
    }
    const responseTimes = requests.flatMap((request) => {
        const firstMessage = firstProviderMessage.get(request.id)
        if (!firstMessage) return []
        return [Math.max(0, (firstMessage.getTime() - request.createdAt.getTime()) / 60_000)]
    })

    const eligibleQuoteRequests = new Set(quotes.map((quote) => quote.requestId))
    for (const request of requests) {
        if (request.estimateSnapshot || request.acceptedQuoteAt) eligibleQuoteRequests.add(request.id)
    }
    const confirmed = requests.filter((request) => Boolean(request.clientConfirmedAt && request.providerConfirmedAt))
    const completed = requests.filter((request) => request.status === ServiceRequestStatus.Closed && request.clientConfirmedAt && request.providerConfirmedAt)
    const clientCounts = new Map<string, number>()
    for (const request of requests) clientCounts.set(request.clientId, (clientCounts.get(request.clientId) ?? 0) + 1)
    const repeatCustomers = [...clientCounts.values()].filter((count) => count > 1).length
    const quoteAccepted = requests.filter((request) => request.acceptedQuoteAt !== null).length
    const cancelled = requests.filter((request) => request.status === ServiceRequestStatus.Cancelled).length
    const noShows = requests.filter((request) => request.status === ServiceRequestStatus.NoShow).length

    return {
        providerId,
        generatedAt: new Date().toISOString(),
        inquiries: requests.filter((request) => request.status !== ServiceRequestStatus.Draft).length,
        openRequests: requests.filter((request) => [ServiceRequestStatus.Open, ServiceRequestStatus.AwaitingReply, ServiceRequestStatus.EstimateShared].includes(request.status)).length,
        confirmedBookings: confirmed.length,
        completedVisits: completed.length,
        cancelledRequests: cancelled,
        noShowRequests: noShows,
        completionRate: percent(completed.length, confirmed.length),
        quoteConversionRate: percent(quoteAccepted, eligibleQuoteRequests.size),
        averageResponseMinutes: responseTimes.length === 0 ? null : Number((responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length).toFixed(1)),
        repeatCustomers,
        reviewCount: reviews.length,
        averageRating: reviews.length === 0 ? 0 : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)),
        bonusLiabilityPoints: accounts.reduce((sum, account) => sum + account.balancePoints, 0),
        tracking: { impressions: 0, profileOpens: 0, available: false },
    }
}
