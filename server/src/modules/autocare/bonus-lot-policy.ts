import { AutoCareBonusLedgerType } from '../../entities/automotive/bonus.entity.js'

type BonusLedgerItem = {
    id: string
    type: AutoCareBonusLedgerType
    points: number
    idempotencyKey: string
    expiresAt: Date | null
    createdAt: Date
}

type BonusLot = {
    id: string
    remaining: number
    expiresAt: Date | null
    createdAt: Date
    markedExpired: boolean
}

/** Replays a single account's immutable ledger. Spending uses earliest expiry,
 * then creation time. A refund is a new, non-expiring credit: cancelled visits
 * never restore a credit that may have expired while the booking was active. */
export function getExpirableBonusLots(entries: readonly BonusLedgerItem[], now: Date) {
    const lots: BonusLot[] = []
    const byId = new Map<string, BonusLot>()
    const ordered = [...entries].sort((left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))

    for (const entry of ordered) {
        if (entry.points > 0 && (
            entry.type === AutoCareBonusLedgerType.Earn
            || entry.type === AutoCareBonusLedgerType.Adjustment
            || entry.type === AutoCareBonusLedgerType.Refund
        )) {
            const lot = {
                id: entry.id,
                remaining: entry.points,
                expiresAt: entry.expiresAt,
                createdAt: entry.createdAt,
                markedExpired: false,
            }
            lots.push(lot)
            byId.set(lot.id, lot)
            continue
        }

        if (entry.type === AutoCareBonusLedgerType.Redeem && entry.points < 0) {
            let toSpend = -entry.points
            const byPriority = (left: BonusLot, right: BonusLot) =>
                (left.expiresAt?.getTime() ?? Infinity) - (right.expiresAt?.getTime() ?? Infinity)
                || left.createdAt.getTime() - right.createdAt.getTime()
                || left.id.localeCompare(right.id)
            const available = lots
                .filter((lot) => lot.remaining > 0 && (!lot.expiresAt || lot.expiresAt > entry.createdAt))
                .sort(byPriority)
            for (const lot of available) {
                const spent = Math.min(lot.remaining, toSpend)
                lot.remaining -= spent
                toSpend -= spent
                if (toSpend === 0) break
            }
            // Historic redemptions could precede reconciliation. Account for
            // their spending before considering any later fresh grant.
            if (toSpend > 0) {
                for (const lot of lots.filter((candidate) => candidate.remaining > 0).sort(byPriority)) {
                    const spent = Math.min(lot.remaining, toSpend)
                    lot.remaining -= spent
                    toSpend -= spent
                    if (toSpend === 0) break
                }
            }
            continue
        }

        if (entry.type === AutoCareBonusLedgerType.Expire && entry.points < 0) {
            const lot = byId.get(entry.idempotencyKey.slice('expire:'.length))
            if (entry.idempotencyKey.startsWith('expire:') && lot) {
                lot.remaining = Math.max(0, lot.remaining + entry.points)
                lot.markedExpired = true
            }
        }
    }

    return lots.filter((lot) => lot.expiresAt && lot.expiresAt <= now && !lot.markedExpired && lot.remaining > 0)
        .map(({ id, remaining }) => ({ id, points: remaining }))
}
