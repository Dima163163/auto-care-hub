import { mockAutoCareServiceRequests } from './mock-fixtures'

export function expireMockAutoCareQuotes(now = Date.now()) {
    for (const item of mockAutoCareServiceRequests) {
        const latestQuote = item.quoteHistory.at(-1)
        if (!latestQuote || latestQuote.status !== 'pending' || !latestQuote.validUntil) continue
        if (Date.parse(latestQuote.validUntil) > now) continue
        latestQuote.status = 'expired'
        if (item.quote) item.quote.status = 'expired'
        if (item.status === 'estimate_shared') item.status = 'awaiting_reply'
        item.updatedAt = new Date(now).toISOString()
    }
}
