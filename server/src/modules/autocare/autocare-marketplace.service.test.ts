import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { assertOwnerBroadcastAccess, getAutoCareProviderTrust } from './autocare-marketplace.service.js'

describe('AutoCare broadcast ownership', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
    })

    it('does not let an unrelated owner inspect a client broadcast', async () => {
        mocks.getRepository.mockReturnValue({
            find: vi.fn().mockResolvedValue([]),
        })

        await expect(assertOwnerBroadcastAccess(
            { id: 'owner-2', role: UserRole.Owner } as never,
            {
                id: 'broadcast-1',
                clientId: 'client-1',
                serviceDefinitionId: 'definition-1',
                status: 'open',
                expiresAt: new Date(Date.now() + 60_000),
            } as never,
        )).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows the broadcast owner without provider lookups', async () => {
        await expect(assertOwnerBroadcastAccess(
            { id: 'client-1', role: UserRole.Client } as never,
            { id: 'broadcast-1', clientId: 'client-1' } as never,
        )).resolves.toBeUndefined()
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('serves trust from persisted snapshots without recalculating on a public read', async () => {
        const provider = {
            id: 'provider-1',
            status: AutomotiveProviderStatus.Active,
            verified: true,
            rating: 4.5,
            reviewCount: 12,
            yearsActive: 4,
            trustScore: 82,
            trustBadge: 'quality',
            trustReassessedAt: new Date('2026-08-20T12:00:00.000Z'),
        }
        const snapshot = {
            id: 'snapshot-1',
            providerId: 'provider-1',
            locationId: 'location-1',
            policyVersion: 'autocare-trust-v1',
            score: '82.5',
            badge: 'quality',
            computedAt: new Date('2026-08-20T12:00:00.000Z'),
            validUntil: new Date('2026-08-21T12:00:00.000Z'),
            inputCounters: {
                profileFields: 4,
                reviewCount: 12,
                verifiedEvidenceCount: 2,
                activeGuaranteeClaims: 0,
                completedInteractionCount: 20,
                cancelledInteractionCount: 1,
                noShowInteractionCount: 0,
                rating: 4.5,
                complaintRate: 0,
                responseTimeMinutes: 30,
                recentRatingTrend: 0.1,
                moderationViolationCount: 0,
            },
            reasonCodes: [],
        }
        mocks.getRepository
            .mockReturnValueOnce({ findOneBy: vi.fn().mockResolvedValue(provider) })
            .mockReturnValueOnce({ find: vi.fn().mockResolvedValue([]) })
            .mockReturnValueOnce({ find: vi.fn().mockResolvedValue([snapshot]) })

        const result = await getAutoCareProviderTrust('provider-1')

        expect(result.score).toBe(82.5)
        expect(result.snapshots).toHaveLength(1)
        expect(result.factors.confidence).toBeGreaterThan(0)
        expect(mocks.getRepository).toHaveBeenCalledTimes(3)
    })
})
