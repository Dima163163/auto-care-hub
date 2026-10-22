import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn(), scopes: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
vi.mock('./provider-access.service.js', () => ({ getManagedProviderPermissionScopes: mocks.scopes }))
vi.mock('./request-response.js', () => ({ requestResponse: (request: { id: string }) => ({ id: request.id }), rescheduleResponse: vi.fn() }))

import {
    AutomotiveProviderEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
    AutomotiveServiceOfferingEntity,
    AutoCareServiceQuoteEntity,
    AutoCareRescheduleRequestEntity,
    ServiceRequestEntity,
} from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { encodeCursor } from '../../shared/http/cursor-pagination.js'
import { getMyAutoCareServiceRequestPage, getMyAutoCareServiceRequests, getOwnerAutoCareServiceRequestPage } from './request-read.service.js'

function query(rows: unknown[] = []) {
    const result = { where: vi.fn(), andWhere: vi.fn(), orderBy: vi.fn(), addOrderBy: vi.fn(), take: vi.fn(), getMany: vi.fn().mockResolvedValue(rows) }
    for (const method of [result.where, result.andWhere, result.orderBy, result.addOrderBy, result.take]) method.mockReturnValue(result)
    return result
}

describe('bounded service request pages', () => {
    beforeEach(() => { mocks.getRepository.mockReset(); mocks.scopes.mockReset() })

    function setup(rows: ServiceRequestEntity[]) {
        const requestQuery = query(rows)
        const quoteQuery = query([])
        const find = vi.fn().mockResolvedValue([])
        const providers = rows.map((row) => ({ id: row.providerId, name: 'Provider' }))
        const locations = rows.map((row) => ({ id: row.locationId, address: 'Address' }))
        const definitions = rows.map((row) => ({ id: row.definitionId, slug: 'service', labels: { en: 'Service' } }))
        const providerFind = vi.fn().mockResolvedValue(providers)
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === ServiceRequestEntity) return { createQueryBuilder: () => requestQuery }
            if (entity === AutoCareServiceQuoteEntity) return { createQueryBuilder: () => quoteQuery }
            if (entity === AutomotiveProviderEntity) return { find: providerFind }
            if (entity === AutomotiveServiceLocationEntity) return { find: vi.fn().mockResolvedValue(locations) }
            if (entity === AutomotiveServiceDefinitionEntity) return { find: vi.fn().mockResolvedValue(definitions) }
            if (entity === AutomotiveServiceOfferingEntity || entity === AutoCareRescheduleRequestEntity) return { find }
            throw new Error('Unexpected repository')
        })
        return { requestQuery, quoteQuery, providerFind }
    }

    const row = (id: string) => Object.assign(new ServiceRequestEntity(), {
        id, providerId: 'provider-1', locationId: 'branch-1', definitionId: 'service-1',
        offeringId: null, clientId: 'client-1', createdAt: new Date('2026-10-22T10:00:00Z'),
    })

    it('limits the client SQL query before loading related data', async () => {
        const rows = [row('00000000-0000-4000-8000-000000000001'), row('00000000-0000-4000-8000-000000000002')]
        const { requestQuery, quoteQuery } = setup(rows)
        const client = Object.assign(new UserEntity(), { id: 'client-1', role: UserRole.Client })
        const result = await getMyAutoCareServiceRequestPage(client, { limit: 1 })

        expect(requestQuery.take).toHaveBeenCalledWith(2)
        expect(requestQuery.where).toHaveBeenCalledWith('serviceRequest.clientId = :clientId', { clientId: client.id })
        expect(result).toMatchObject({ items: [{ id: rows[0]!.id }], nextCursor: expect.any(String) })
        expect(quoteQuery.getMany).toHaveBeenCalledOnce()
    })

    it('applies branch authorization in SQL before pagination', async () => {
        const { requestQuery } = setup([row('00000000-0000-4000-8000-000000000003')])
        mocks.scopes.mockResolvedValue([{ providerId: 'provider-1', locationIds: ['branch-1'] }])
        const owner = Object.assign(new UserEntity(), { id: 'owner-1', role: UserRole.Owner })
        await getOwnerAutoCareServiceRequestPage(owner, { limit: 25 })

        expect(requestQuery.where).toHaveBeenCalledWith(expect.stringContaining('serviceRequest.locationId IN (:...locations0)'), expect.objectContaining({ provider0: 'provider-1', locations0: ['branch-1'] }))
        expect(requestQuery.take).toHaveBeenCalledWith(26)
    })

    it('rejects a malformed cursor id before the database read', async () => {
        const { requestQuery } = setup([])
        const client = Object.assign(new UserEntity(), { id: 'client-1', role: UserRole.Client })
        await expect(getMyAutoCareServiceRequestPage(client, {
            cursor: encodeCursor({ createdAt: '2026-10-22T10:00:00.000Z', id: 'not-a-uuid' }),
        })).rejects.toMatchObject({ statusCode: 400 })
        expect(requestQuery.getMany).not.toHaveBeenCalled()
    })

    it('caps the legacy array response at 100 requests before hydration', async () => {
        const rows = Array.from({ length: 102 }, (_, index) => row(`request-${index}`))
        const { requestQuery, providerFind, quoteQuery } = setup(rows)
        const client = Object.assign(new UserEntity(), { id: 'client-1', role: UserRole.Client })
        const items = await getMyAutoCareServiceRequests(client)

        expect(items).toHaveLength(100)
        expect(requestQuery.take).toHaveBeenCalledWith(101)
        expect(providerFind).toHaveBeenCalledOnce()
        expect(quoteQuery.getMany).toHaveBeenCalledOnce()
    })
})
