import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn(), scopes: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
vi.mock('./provider-access.service.js', () => ({ getManagedProviderPermissionScopes: mocks.scopes }))

import {
    AutoCareBonusAccountEntity,
    AutoCareProviderDailyMetricEntity,
    AutoCareServiceQuoteEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveReviewEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { getOwnerAutoCareProviderAnalytics } from './autocare-analytics.service.js'

function query(rows: unknown[] = [], raw: unknown = null) {
    const value = {
        select: vi.fn(), addSelect: vi.fn(), where: vi.fn(), andWhere: vi.fn(),
        orderBy: vi.fn(), addOrderBy: vi.fn(), take: vi.fn(),
        getMany: vi.fn().mockResolvedValue(rows), getRawOne: vi.fn().mockResolvedValue(raw), getRawMany: vi.fn().mockResolvedValue([]),
    }
    for (const method of [value.select, value.addSelect, value.where, value.andWhere, value.orderBy, value.addOrderBy, value.take]) method.mockReturnValue(value)
    return value
}

describe('owner analytics request budget', () => {
    it('keeps lifetime counts accurate across bounded request pages', async () => {
        const providerId = '00000000-0000-4000-8000-000000000001'
        const createdAt = new Date('2026-10-01T10:00:00Z')
        const requests = Array.from({ length: 501 }, (_, index) => Object.assign(new ServiceRequestEntity(), {
            id: `request-${index}`, providerId, locationId: 'branch-1', clientId: 'client-1',
            status: ServiceRequestStatus.Closed, createdAt, completedAt: createdAt,
            clientConfirmedAt: createdAt, providerConfirmedAt: createdAt,
            acceptedQuoteAt: null, estimateSnapshot: null,
        }))
        const requestQueries: ReturnType<typeof query>[] = []
        const requestRepository = { createQueryBuilder: vi.fn(() => {
            const builder = query(requestQueries.length === 0 ? requests : [requests[500]])
            requestQueries.push(builder)
            return builder
        }) }
        mocks.scopes.mockResolvedValue([{ providerId, locationIds: null }])
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === ServiceRequestEntity) return requestRepository
            if (entity === AutomotiveProviderEntity) return { findOneBy: vi.fn().mockResolvedValue({ id: providerId, ownerId: 'owner-1' }) }
            if (entity === AutomotiveProviderMembershipEntity) return { find: vi.fn().mockResolvedValue([]) }
            if (entity === AutoCareServiceQuoteEntity) return { createQueryBuilder: () => query() }
            if (entity === ServiceMessageEntity) return { createQueryBuilder: () => query([]) }
            if (entity === AutomotiveReviewEntity) return { createQueryBuilder: () => query([], { count: '0', ratingSum: '0' }) }
            if (entity === AutoCareBonusAccountEntity) return { createQueryBuilder: () => query([], { points: '0' }) }
            if (entity === AutoCareProviderDailyMetricEntity) return { createQueryBuilder: () => query([], { impressions: '0', profileOpens: '0' }) }
            throw new Error('Unexpected repository')
        })
        const owner = Object.assign(new UserEntity(), { id: 'owner-1', role: UserRole.Owner })
        const result = await getOwnerAutoCareProviderAnalytics(owner, providerId)

        expect(result).toMatchObject({ inquiries: 501, confirmedBookings: 501, completedVisits: 501, completionRate: 100, repeatCustomers: 1 })
        expect(requestQueries).toHaveLength(2)
        expect(requestQueries[0]!.take).toHaveBeenCalledWith(501)
        expect(requestQueries[1]!.andWhere).toHaveBeenCalledWith(expect.stringContaining('request.createdAt < :cursorCreatedAt'), expect.any(Object))
        expect(requestQueries[0]!.select).toHaveBeenCalledWith(expect.not.arrayContaining(['request.contactSnapshot', 'request.note']))
    })
})
