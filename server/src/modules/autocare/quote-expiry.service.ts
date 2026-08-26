import { LessThanOrEqual } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { AutoCareQuoteStatus, AutoCareServiceQuoteEntity } from '../../entities/automotive/service-quote.entity.js'
import { ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { isAutoCareQuoteExpired } from './quote-policy.js'
import { metrics } from '../../shared/observability/metrics.js'

const DEFAULT_QUOTE_EXPIRY_BATCH_SIZE = 500

export type AutoCareQuoteExpiryResult = {
    expired: number
    requestsReopened: number
}

/**
 * Marks due quote versions as terminal and re-opens requests whose latest quote
 * expired without a client decision. Request and quote rows are locked in the
 * same order as acceptance, preventing a maintenance/acceptance deadlock.
 */
export async function expireAutoCareServiceQuotes(
    now = new Date(),
    batchSize = DEFAULT_QUOTE_EXPIRY_BATCH_SIZE,
): Promise<AutoCareQuoteExpiryResult> {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
        throw new Error('Quote expiry batch size must be a positive integer.')
    }

    const candidates = await AppDataSource.getRepository(AutoCareServiceQuoteEntity).find({
        where: {
            status: AutoCareQuoteStatus.Pending,
            validUntil: LessThanOrEqual(now),
        },
        order: { validUntil: 'ASC' },
        take: batchSize,
    })
    if (candidates.length === 0) return { expired: 0, requestsReopened: 0 }

    const result = await AppDataSource.transaction(async (manager) => {
        const quoteRepository = manager.getRepository(AutoCareServiceQuoteEntity)
        const requestRepository = manager.getRepository(ServiceRequestEntity)
        let expired = 0
        let requestsReopened = 0

        for (const candidate of candidates) {
            const request = await requestRepository.findOne({
                where: { id: candidate.requestId },
                lock: { mode: 'pessimistic_write' },
            })
            if (!request) continue
            const quote = await quoteRepository.findOne({
                where: { id: candidate.id },
                lock: { mode: 'pessimistic_write' },
            })
            if (!quote || quote.status !== AutoCareQuoteStatus.Pending || !isAutoCareQuoteExpired(quote.validUntil, now)) continue

            quote.status = AutoCareQuoteStatus.Expired
            await quoteRepository.save(quote)
            expired += 1

            if (request.status !== ServiceRequestStatus.EstimateShared || request.acceptedQuoteVersion !== null) continue
            const latestQuote = await quoteRepository.findOne({
                where: { requestId: request.id },
                order: { version: 'DESC' },
            })
            if (!latestQuote || latestQuote.id !== quote.id) continue

            request.status = ServiceRequestStatus.AwaitingReply
            request.estimateSnapshot = {
                ...(request.estimateSnapshot ?? {}),
                quoteStatus: AutoCareQuoteStatus.Expired,
                expiredAt: now.toISOString(),
            }
            await requestRepository.save(request)
            requestsReopened += 1
        }

        return { expired, requestsReopened }
    })

    metrics.setGauge('maintenance_autocare_quotes_expired_last', result.expired)
    metrics.setGauge('maintenance_autocare_quote_requests_reopened_last', result.requestsReopened)
    metrics.increment('maintenance_autocare_quotes_expired_total', result.expired)
    metrics.increment('maintenance_autocare_quote_requests_reopened_total', result.requestsReopened)
    return result
}
