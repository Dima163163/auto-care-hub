import { AppDataSource } from '../../database/data-source.js'
import { SecurityMitigationEntity } from '../../entities/security-mitigation/security-mitigation.entity.js'
import { logError } from '../../shared/observability/logger.js'
import { normalizeIpAddress } from '../../shared/security/trusted-proxy.js'

const CACHE_REFRESH_INTERVAL_MS = 15_000
const MAX_CACHED_MITIGATIONS = 5_000
const BLOCKED_SIGNAL_INTERVAL_MS = 60_000
const MAX_BLOCKED_SIGNAL_KEYS = 10_000

const activeMitigations = new Map<string, number>()
const lastBlockedSignalAt = new Map<string, number>()
let lastRefreshAt = 0
let refreshPromise: Promise<void> | null = null

export function getSecurityMitigationLookupKey(ipAddress: string) {
    return normalizeIpAddress(ipAddress)
}

export function cacheSecurityMitigation(value: string, expiresAt: Date | string) {
    const expiry = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime()
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return
    activeMitigations.set(value, expiry)
}

export function removeCachedSecurityMitigation(value: string) {
    activeMitigations.delete(value)
}

export function clearSecurityMitigationCache() {
    activeMitigations.clear()
    lastBlockedSignalAt.clear()
    lastRefreshAt = 0
    refreshPromise = null
}

export function shouldRecordSecurityMitigationSignal(ipAddress: string, now = Date.now()) {
    const key = getSecurityMitigationLookupKey(ipAddress)
    if (!key) return false

    const previous = lastBlockedSignalAt.get(key)
    if (previous !== undefined && now - previous < BLOCKED_SIGNAL_INTERVAL_MS) return false

    if (!lastBlockedSignalAt.has(key) && lastBlockedSignalAt.size >= MAX_BLOCKED_SIGNAL_KEYS) {
        const oldestKey = lastBlockedSignalAt.keys().next().value
        if (oldestKey) lastBlockedSignalAt.delete(oldestKey)
    }

    lastBlockedSignalAt.delete(key)
    lastBlockedSignalAt.set(key, now)
    return true
}

export function isSecurityMitigationCached(ipAddress: string, now = Date.now()) {
    const key = getSecurityMitigationLookupKey(ipAddress)
    if (!key) return false
    const expiry = activeMitigations.get(key)
    if (expiry === undefined) return false
    if (expiry <= now) {
        activeMitigations.delete(key)
        return false
    }
    return true
}

async function refreshSecurityMitigationCache(now = Date.now()) {
    if (refreshPromise) return refreshPromise
    if (now - lastRefreshAt < CACHE_REFRESH_INTERVAL_MS) return

    refreshPromise = (async () => {
        try {
            const rows = await AppDataSource.getRepository(SecurityMitigationEntity)
                .createQueryBuilder('mitigation')
                .where('mitigation.revokedAt IS NULL')
                .andWhere('mitigation.expiresAt > :now', { now: new Date(now) })
                .orderBy('mitigation.expiresAt', 'ASC')
                .take(MAX_CACHED_MITIGATIONS)
                .getMany()

            activeMitigations.clear()
            for (const row of rows) cacheSecurityMitigation(row.value, row.expiresAt)
        } catch (error) {
            logError('Security mitigation cache refresh failed; keeping previous cache', error)
        } finally {
            lastRefreshAt = Date.now()
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export async function isSecurityIpBlocked(ipAddress: string, now = Date.now()) {
    if (isSecurityMitigationCached(ipAddress, now)) return true
    await refreshSecurityMitigationCache(now)
    return isSecurityMitigationCached(ipAddress, now)
}
