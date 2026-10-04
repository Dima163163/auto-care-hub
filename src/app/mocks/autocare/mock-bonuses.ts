import { mockAutoCareBonusAccounts, mockAutoCareBonusPrograms } from './mock-fixtures'
import type { MockAutoCareBonusAccount, MockAutoCareServiceRequest } from './mock-fixtures'

export function awardMockAutoCareBonus(item: MockAutoCareServiceRequest, actorId: string) {
    const program = mockAutoCareBonusPrograms.get(item.providerId)
    if (!program || !item.booking || item.booking.amountMinor <= 0) return
    const points = Math.min(Math.floor(item.booking.amountMinor * program.earnPercent / 10_000), program.maxEarnPointsPerVisit ?? Number.MAX_SAFE_INTEGER)
    if (points <= 0) return
    const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === item.clientId && candidate.providerId === item.providerId)
        ?? (() => { const created: MockAutoCareBonusAccount = { id: `bonus-account-${Date.now()}`, clientId: item.clientId, providerId: item.providerId, balancePoints: 0, earnedPoints: 0, redeemedPoints: 0, entries: [] }; mockAutoCareBonusAccounts.push(created); return created })()
    if (account.entries.some((entry) => entry.requestId === item.id && entry.type === 'earn')) return
    const createdAt = new Date().toISOString()
    account.balancePoints += points
    account.earnedPoints += points
    account.entries.unshift({ id: `bonus-entry-${Date.now()}`, type: 'earn', points, reason: 'Бонус за завершённый визит', requestId: item.id, expiresAt: program.expiresAfterDays ? new Date(Date.now() + program.expiresAfterDays * 86_400_000).toISOString() : null, createdAt })
    void actorId
}

export function reconcileMockAutoCareBonusAccount(account: MockAutoCareBonusAccount, now = Date.now()) {
    let expiredPoints = 0
    const expiredCandidates = account.entries.filter((entry) => (entry.type === 'earn' || entry.type === 'adjustment') && entry.points > 0 && entry.expiresAt && Date.parse(entry.expiresAt) <= now)
    for (const entry of expiredCandidates) {
        const idempotencyId = `bonus-expire-${entry.id}`
        if (account.entries.some((candidate) => candidate.id === idempotencyId)) continue
        const points = Math.min(entry.points, Math.max(account.balancePoints - expiredPoints, 0))
        if (points <= 0) continue
        account.entries.unshift({ id: idempotencyId, type: 'expire', points: -points, reason: 'Истёк срок действия бонусов', requestId: entry.requestId, expiresAt: null, createdAt: new Date(now).toISOString() })
        expiredPoints += points
    }
    if (expiredPoints > 0) account.balancePoints -= expiredPoints
}

export function refundMockAutoCareBonusForCancelledRequest(item: MockAutoCareServiceRequest, actorId: string) {
    if (item.status !== 'cancelled') return
    const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === item.clientId && candidate.providerId === item.providerId)
    if (!account) return
    const redeemed = account.entries.find((entry) => entry.requestId === item.id && entry.type === 'redeem')
    if (!redeemed || account.entries.some((entry) => entry.id === `bonus-refund-${item.id}`)) return
    const points = Math.abs(redeemed.points)
    if (points <= 0) return
    account.entries.unshift({ id: `bonus-refund-${item.id}`, type: 'refund', points, reason: 'Возврат бонусов после отмены записи', requestId: item.id, expiresAt: null, createdAt: new Date().toISOString() })
    account.balancePoints += points
    account.redeemedPoints = Math.max(0, account.redeemedPoints - points)
    void actorId
}
