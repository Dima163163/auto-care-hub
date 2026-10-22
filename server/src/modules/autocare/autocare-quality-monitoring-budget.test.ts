import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
vi.mock('../admin/super-admin-trust-policy.service.js', () => ({ getAutoCareTrustRollout: () => ({ enabled: false, marketIds: [], percentage: 0 }) }))

import {
    AutoCareAppealEntity,
    AutoCareTrustSnapshotEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveReviewEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    ServiceMessageEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
} from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { getAutoCareQualityMonitoring } from './autocare-quality-monitoring.service.js'

function query(rows: unknown[]) {
    const result = {
        select: vi.fn(), addSelect: vi.fn(), where: vi.fn(), andWhere: vi.fn(),
        groupBy: vi.fn(), orderBy: vi.fn(), addOrderBy: vi.fn(), take: vi.fn(),
        getMany: vi.fn().mockResolvedValue(rows), getRawMany: vi.fn().mockResolvedValue([]),
    }
    for (const method of [result.select, result.addSelect, result.where, result.andWhere, result.groupBy, result.orderBy, result.addOrderBy, result.take]) method.mockReturnValue(result)
    return result
}

describe('admin quality monitoring request budget', () => {
    it('keeps full request and calibration counts across bounded pages', async () => {
        const createdAt = new Date('2026-10-01T10:00:00Z')
        const requests = Array.from({ length: 501 }, (_, index) => Object.assign(new ServiceRequestEntity(), {
            id: `request-${index}`, providerId: 'provider-1', locationId: 'branch-1', clientId: 'client-1',
            status: ServiceRequestStatus.Closed, createdAt, completedAt: createdAt,
            clientConfirmedAt: createdAt, providerConfirmedAt: createdAt,
        }))
        const requestQueries: ReturnType<typeof query>[] = []
        const messageQueries: ReturnType<typeof query>[] = []
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === ServiceRequestEntity) return { createQueryBuilder: () => {
                const builder = query(requestQueries.length === 0 ? requests : [requests[500]])
                requestQueries.push(builder)
                return builder
            } }
            if (entity === AutomotiveReviewEntity) return { find: vi.fn().mockResolvedValue([]), createQueryBuilder: () => query([]) }
            if (entity === AutomotiveProviderEntity) return { find: vi.fn().mockResolvedValue([{ id: 'provider-1', ownerId: 'owner-1', status: 'active', verified: false, trustBadge: null, trustReassessedAt: null }]) }
            if (entity === AutoCareAppealEntity) return { countBy: vi.fn().mockResolvedValue(0) }
            if (entity === ServiceMessageEntity) return { createQueryBuilder: () => {
                const builder = query([])
                messageQueries.push(builder)
                return builder
            } }
            if ([AutomotiveProviderMembershipEntity, AutoCareTrustSnapshotEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity].includes(entity as never)) return { find: vi.fn().mockResolvedValue([]) }
            throw new Error('Unexpected repository')
        })
        const admin = Object.assign(new UserEntity(), { id: 'admin-1', role: UserRole.Admin })
        const result = await getAutoCareQualityMonitoring(admin)

        expect(result.requests).toMatchObject({ total: 501, completed: 501 })
        expect(result.reliability).toMatchObject({ confirmedBookings: 501, confirmationSamples: 501 })
        expect(result.ranking.calibration.confirmedVisits).toBe(501)
        expect(requestQueries).toHaveLength(2)
        expect(requestQueries[0]!.take).toHaveBeenCalledWith(501)
        expect(messageQueries).toHaveLength(2)
        expect(messageQueries[0]!.take).toHaveBeenCalledWith(1001)
    })
})
