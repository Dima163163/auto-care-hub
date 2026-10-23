import { describe, expect, it } from 'vitest'

import { AutoCareBonusLedgerType as Type } from '../../entities/automotive/bonus.entity.js'
import { getExpirableBonusLots } from './bonus-lot-policy.js'

const start = new Date('2026-01-01T00:00:00.000Z')
const expiry = new Date('2026-01-05T00:00:00.000Z')
const laterExpiry = new Date('2026-01-10T00:00:00.000Z')
const now = new Date('2026-01-06T00:00:00.000Z')

function item(id: string, type: Type, points: number, day: number, expiresAt: Date | null = null, idempotencyKey = id) {
    return { id, type, points, idempotencyKey, expiresAt, createdAt: new Date(start.getTime() + day * 86_400_000) }
}

describe('bonus lot expiration', () => {
    it('does not expire an old lot after it was fully redeemed and fresh points were earned', () => {
        expect(getExpirableBonusLots([
            item('old', Type.Earn, 100, 0, expiry),
            item('spend', Type.Redeem, -100, 1),
            item('fresh', Type.Earn, 100, 2, laterExpiry),
        ], now)).toEqual([])
    })

    it('expires only the unused portion of the earliest-expiring lot', () => {
        expect(getExpirableBonusLots([
            item('old', Type.Earn, 100, 0, expiry),
            item('new', Type.Earn, 100, 1, laterExpiry),
            item('spend', Type.Redeem, -60, 2),
        ], now)).toEqual([{ id: 'old', points: 40 }])
    })

    it('spends the earliest expiry before older credits with a later expiry', () => {
        expect(getExpirableBonusLots([
            item('later', Type.Earn, 100, 0, laterExpiry),
            item('earlier', Type.Earn, 100, 1, expiry),
            item('spend', Type.Redeem, -70, 2),
        ], now)).toEqual([{ id: 'earlier', points: 30 }])
    })

    it('does not expire a lot twice and treats a refund as new non-expiring credit', () => {
        expect(getExpirableBonusLots([
            item('old', Type.Earn, 100, 0, expiry),
            item('spend', Type.Redeem, -40, 1),
            item('refund', Type.Refund, 40, 2),
            item('expired', Type.Expire, -60, 5, null, 'expire:old'),
        ], now)).toEqual([])
    })

    it('does not allocate later spending to a lot after its expiry', () => {
        expect(getExpirableBonusLots([
            item('old', Type.Earn, 100, 0, expiry),
            item('fresh', Type.Earn, 100, 2, laterExpiry),
            item('spend', Type.Redeem, -100, 5),
        ], now)).toEqual([{ id: 'old', points: 100 }])
    })

    it('attributes an old unreconciled redemption to expired credit before a later grant', () => {
        expect(getExpirableBonusLots([
            item('old', Type.Earn, 100, 0, expiry),
            item('late-spend', Type.Redeem, -100, 5),
            item('fresh', Type.Earn, 100, 6, laterExpiry),
        ], new Date('2026-01-08T00:00:00.000Z'))).toEqual([])
    })
})
