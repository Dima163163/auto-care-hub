import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import { AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    createAutoCareCatalogGapRequest,
    decideAdminCatalogGapRequest,
    listAdminCatalogGapRequests,
    updateAdminAutoCareServiceDefinition,
} from './catalog-gap.service.js'

const client = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Client } as never
const admin = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Admin } as never

const validGap = {
    proposedSlug: 'wheel-alignment',
    categorySlug: 'maintenance',
    labels: { en: 'Wheel alignment' },
    priceType: AutomotivePriceType.Fixed,
    comparisonAttributes: ['duration'],
    rationale: 'This service is frequently requested but missing from the catalog.',
}

const validDefinition = {
    categorySlug: 'maintenance',
    labels: { en: 'Wheel alignment' },
    priceType: AutomotivePriceType.Fixed,
    comparisonAttributes: ['duration'],
    active: true,
}

describe('Catalog gap service boundaries', () => {
    beforeEach(() => {
        mocks.transaction.mockReset()
    })

    it('rejects malformed catalog proposals before provider lookup', async () => {
        await expect(createAutoCareCatalogGapRequest(client, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareCatalogGapRequest(client, { ...validGap, providerId: 'not-a-uuid' })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds admin catalog-gap filters before repository access', async () => {
        await expect(listAdminCatalogGapRequests(admin, 'unknown' as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(listAdminCatalogGapRequests(client, AutomotiveCatalogGapRequestStatus.Pending)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('keeps admin authorization and id validation ahead of gap decisions', async () => {
        await expect(decideAdminCatalogGapRequest(client, 'not-a-uuid', AutomotiveCatalogGapRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminCatalogGapRequest(admin, 'not-a-uuid', AutomotiveCatalogGapRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('prevents an administrator from deciding their own catalog request inside the row lock', async () => {
        const requestId = '33333333-3333-4333-8333-333333333333'
        const requestRow = {
            id: requestId,
            requestedById: admin.id,
            status: AutomotiveCatalogGapRequestStatus.Pending,
        }
        const query = {
            where: vi.fn().mockReturnThis(),
            setLock: vi.fn().mockReturnThis(),
            getOne: vi.fn().mockResolvedValue(requestRow),
        }
        const requestRepository = {
            createQueryBuilder: vi.fn().mockReturnValue(query),
            save: vi.fn(),
        }
        const manager = { getRepository: vi.fn().mockReturnValue(requestRepository) }
        mocks.transaction.mockImplementation(async (run) => run(manager))

        await expect(decideAdminCatalogGapRequest(admin, requestId, AutomotiveCatalogGapRequestStatus.Approved))
            .rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
        expect(query.setLock).toHaveBeenCalledWith('pessimistic_write')
        expect(requestRepository.save).not.toHaveBeenCalled()
        expect(manager.getRepository).toHaveBeenCalledTimes(1)
    })

    it('lets another administrator reject a pending catalog request', async () => {
        const requestId = '33333333-3333-4333-8333-333333333333'
        const requestRow = {
            id: requestId,
            requestedById: client.id,
            providerId: null,
            proposedSlug: validGap.proposedSlug,
            categorySlug: validGap.categorySlug,
            labels: validGap.labels,
            priceType: validGap.priceType,
            comparisonAttributes: validGap.comparisonAttributes,
            rationale: validGap.rationale,
            status: AutomotiveCatalogGapRequestStatus.Pending,
            reviewedById: null,
            reviewReason: null,
            reviewedAt: null,
            createdAt: new Date('2026-10-29T10:00:00.000Z'),
            updatedAt: new Date('2026-10-29T10:00:00.000Z'),
        }
        const query = {
            where: vi.fn().mockReturnThis(),
            setLock: vi.fn().mockReturnThis(),
            getOne: vi.fn().mockResolvedValue(requestRow),
        }
        const requestRepository = {
            createQueryBuilder: vi.fn().mockReturnValue(query),
            save: vi.fn().mockImplementation(async (request) => request),
        }
        const manager = { getRepository: vi.fn().mockReturnValue(requestRepository) }
        mocks.transaction.mockImplementation(async (run) => run(manager))

        const result = await decideAdminCatalogGapRequest(admin, requestId, AutomotiveCatalogGapRequestStatus.Rejected, 'Duplicate proposal.')
        expect(result.status).toBe(AutomotiveCatalogGapRequestStatus.Rejected)
        expect(result.reviewedById).toBe(admin.id)
        expect(requestRepository.save).toHaveBeenCalledOnce()
    })

    it('rejects malformed service-definition ids before repository access', async () => {
        await expect(updateAdminAutoCareServiceDefinition(admin, 'not-a-uuid', validDefinition)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed definition payloads and preserves admin authorization order', async () => {
        await expect(updateAdminAutoCareServiceDefinition(admin, '11111111-1111-4111-8111-111111111111', { ...validDefinition, extra: true })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminAutoCareServiceDefinition(client, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 403 })
    })
})
