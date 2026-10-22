import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AutomotiveProviderEntity, AutomotiveProviderStatus } from '../../entities/automotive/automotive.entity.js'

const mocks = vi.hoisted(() => {
    const query = {
        select: vi.fn(), where: vi.fn(), andWhere: vi.fn(), orderBy: vi.fn(),
        addOrderBy: vi.fn(), limit: vi.fn(), getRawMany: vi.fn(),
    }
    for (const method of ['select', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'limit'] as const) {
        query[method].mockReturnValue(query)
    }
    return {
        query,
        findOneBy: vi.fn(),
        update: vi.fn(),
        find: vi.fn(),
    }
})

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        manager: {
            getRepository: () => ({
                findOneBy: mocks.findOneBy,
                update: mocks.update,
                find: mocks.find,
            }),
        },
        getRepository: () => ({
            createQueryBuilder: () => mocks.query,
            update: mocks.update,
        }),
    },
}))
vi.mock('../admin/super-admin-trust-policy.service.js', () => ({
    getAutoCareTrustPolicy: async () => ({ reassessmentIntervalHours: 24, policyVersion: 'test' }),
}))
vi.mock('./trust-score.js', () => ({
    calculateAutoCareTrustScore: () => ({ score: 0, badge: null }),
}))

const { reassessAutoCareProviderTrust, reassessAutoCareTrustScores } = await import('./trust-score.service.js')

const provider = (id: string) => ({
    id,
    status: AutomotiveProviderStatus.Active,
    description: null,
    phone: null,
    email: null,
    websiteUrl: null,
    warrantyText: null,
    rating: 0,
    verified: false,
    yearsActive: 0,
    trustScore: 0,
    trustBadge: null,
    trustReassessedAt: new Date('2026-01-01T00:00:00.000Z'),
    trustReassessmentAttemptedAt: null,
}) as AutomotiveProviderEntity

beforeEach(() => {
    vi.clearAllMocks()
    mocks.find.mockResolvedValue([])
    mocks.update.mockResolvedValue({ affected: 1 })
})

describe('AutoCare trust reassessment queue', () => {
    it('advances the successful scan watermark even when the score is unchanged', async () => {
        mocks.findOneBy.mockResolvedValue(provider('unchanged'))

        const result = await reassessAutoCareProviderTrust('unchanged')

        expect(result?.changed).toBe(false)
        expect(mocks.update).toHaveBeenCalledWith({ id: 'unchanged' }, expect.objectContaining({
            trustScore: 0,
            trustReassessedAt: expect.any(Date),
            trustReassessmentAttemptedAt: expect.any(Date),
        }))
    })

    it('prioritizes never-attempted due providers and continues past a failed provider', async () => {
        mocks.query.getRawMany.mockResolvedValue([{ id: 'broken' }, { id: 'new' }])
        mocks.findOneBy.mockImplementation(async ({ id }: { id: string }) => {
            if (id === 'broken') throw new Error('Synthetic provider failure')
            return provider(id)
        })

        const result = await reassessAutoCareTrustScores(2)

        expect(result).toEqual({ scanned: 2, changed: 0, failed: 1 })
        expect(mocks.query.andWhere).toHaveBeenCalledWith(
            '(provider.trustReassessedAt IS NULL OR provider.trustReassessedAt <= :dueBefore)',
            { dueBefore: expect.any(Date) },
        )
        expect(mocks.query.andWhere).toHaveBeenCalledWith(
            '(provider.trustReassessmentAttemptedAt IS NULL OR provider.trustReassessmentAttemptedAt <= :retryBefore)',
            { retryBefore: expect.any(Date) },
        )
        expect(mocks.query.orderBy).toHaveBeenCalledWith('provider.trustReassessmentAttemptedAt', 'ASC', 'NULLS FIRST')
        expect(mocks.update).toHaveBeenCalledWith({ id: 'broken' }, {
            trustReassessmentAttemptedAt: expect.any(Date),
        })
        expect(mocks.update).toHaveBeenCalledWith({ id: 'new' }, expect.objectContaining({
            trustReassessedAt: expect.any(Date),
        }))
    })
})
