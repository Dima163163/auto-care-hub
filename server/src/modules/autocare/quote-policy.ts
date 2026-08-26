import { AutoCareQuoteStatus } from '../../entities/automotive/service-quote.entity.js'

export type AutoCareQuoteLifecycleStatus = `${AutoCareQuoteStatus}`

export function isAutoCareQuoteExpired(validUntil: Date | string | null | undefined, now = new Date()) {
    if (!validUntil) return false
    const expiryMs = validUntil instanceof Date ? validUntil.getTime() : Date.parse(validUntil)
    return Number.isFinite(expiryMs) && expiryMs <= now.getTime()
}

/**
 * A pending quote is considered expired immediately after its deadline even
 * before the maintenance worker persists the terminal status. This keeps API
 * responses and acceptance decisions consistent during worker lag.
 */
export function getAutoCareQuoteLifecycleStatus(
    status: AutoCareQuoteStatus,
    validUntil: Date | string | null | undefined,
    now = new Date(),
): AutoCareQuoteLifecycleStatus {
    if (status === AutoCareQuoteStatus.Pending && isAutoCareQuoteExpired(validUntil, now)) {
        return AutoCareQuoteStatus.Expired
    }
    return status
}
