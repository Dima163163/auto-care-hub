import { describe, expect, it, vi } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { AutoCareBonusLedgerType } from '../../entities/automotive/bonus.entity.js'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import {
    awardAutoCareBonusForCompletedVisit,
    calculateAutoCareBonusPoints,
    getMaximumAutoCareBonusRedemptionPoints,
    getMyAutoCareBonusAccounts,
    getOwnerAutoCareBonusProgram,
} from './autocare-bonus.service.js'

describe('calculateAutoCareBonusPoints', () => {
    it('converts minor-unit amount to whole bonus points without floating point drift', () => {
        expect(calculateAutoCareBonusPoints(290_000, 5, null)).toBe(145)
        expect(calculateAutoCareBonusPoints(333_333, 2.5, null)).toBe(83)
    })

    it('applies a provider cap and rejects invalid amounts or rates', () => {
        expect(calculateAutoCareBonusPoints(1_000_000, 10, 500)).toBe(500)
        expect(calculateAutoCareBonusPoints(0, 5, null)).toBe(0)
        expect(calculateAutoCareBonusPoints(100_000, 0, null)).toBe(0)
    })

    it('caps a redemption at the confirmed booking amount and uses the payable amount after a prior discount', () => {
        expect(getMaximumAutoCareBonusRedemptionPoints({
            bookingSnapshot: { amountMinor: 290_000 },
        } as never)).toBe(2900)
        expect(getMaximumAutoCareBonusRedemptionPoints({
            bookingSnapshot: { amountMinor: 290_000, payableAmountMinor: 145_000 },
        } as never)).toBe(1450)
        expect(getMaximumAutoCareBonusRedemptionPoints({
            bookingSnapshot: { amountMinor: 99 },
        } as never)).toBe(0)
    })

    it('rejects bonus account reads for non-clients before touching the repository', async () => {
        await expect(getMyAutoCareBonusAccounts({ id: 'owner-1', role: UserRole.Owner } as never))
            .rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects bonus program reads for non-owners before touching the repository', async () => {
        await expect(getOwnerAutoCareBonusProgram({ id: 'client-1', role: UserRole.Client } as never, 'provider-1'))
            .rejects.toMatchObject({ statusCode: 403 })
    })

    it('does not award points for an unfinished visit', async () => {
        const manager = { getRepository: vi.fn() }
        const result = await awardAutoCareBonusForCompletedVisit(
            manager as never,
            { id: 'request-1', status: ServiceRequestStatus.Accepted, clientId: 'client-1', providerId: 'provider-1' } as never,
            'owner-1',
        )

        expect(result).toBeNull()
        expect(manager.getRepository).not.toHaveBeenCalled()
    })

    it('replays an existing earn entry without mutating the account twice', async () => {
        const existing = { id: 'ledger-1', type: AutoCareBonusLedgerType.Earn, points: 5 }
        const ledgerRepository = { findOne: vi.fn().mockResolvedValue(existing) }
        const accountRepository = {
            findOne: vi.fn().mockResolvedValue({ id: 'account-1', balancePoints: 5, earnedPoints: 5 }),
            save: vi.fn(),
        }
        const programRepository = { findOne: vi.fn().mockResolvedValue({ earnPercent: 5, maxEarnPointsPerVisit: null, expiresAfterDays: null }) }
        const manager = {
            getRepository: vi.fn()
                .mockReturnValueOnce(programRepository)
                .mockReturnValueOnce(accountRepository)
                .mockReturnValueOnce(ledgerRepository),
        }

        const result = await awardAutoCareBonusForCompletedVisit(
            manager as never,
            {
                id: 'request-1',
                status: ServiceRequestStatus.Closed,
                clientId: 'client-1',
                providerId: 'provider-1',
                bookingSnapshot: { amountMinor: 10_000 },
                acceptedQuoteSnapshot: null,
            } as never,
            'owner-1',
        )

        expect(result).toBe(existing)
        expect(accountRepository.save).not.toHaveBeenCalled()
    })

    it('atomically creates a missing account before awarding the first visit', async () => {
        const account = { id: 'account-1', balancePoints: 0, earnedPoints: 0 }
        const existing = { id: 'ledger-1', type: AutoCareBonusLedgerType.Earn, points: 5 }
        const accountRepository = {
            findOne: vi.fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(account),
            upsert: vi.fn().mockResolvedValue(undefined),
            save: vi.fn(),
        }
        const ledgerRepository = { findOne: vi.fn().mockResolvedValue(existing) }
        const manager = {
            getRepository: vi.fn()
                .mockReturnValueOnce({ findOne: vi.fn().mockResolvedValue({ earnPercent: 5, maxEarnPointsPerVisit: null, expiresAfterDays: null }) })
                .mockReturnValueOnce(accountRepository)
                .mockReturnValueOnce(ledgerRepository),
        }

        const result = await awardAutoCareBonusForCompletedVisit(
            manager as never,
            {
                id: 'request-1',
                status: ServiceRequestStatus.Closed,
                clientId: 'client-1',
                providerId: 'provider-1',
                bookingSnapshot: { amountMinor: 10_000 },
                acceptedQuoteSnapshot: null,
            } as never,
            'owner-1',
        )

        expect(result).toBe(existing)
        expect(accountRepository.upsert).toHaveBeenCalledWith(
            { clientId: 'client-1', providerId: 'provider-1' },
            ['clientId', 'providerId'],
        )
    })
})
