import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveServiceDefinitionEntity } from '../../entities/index.js'
import {
    createAutoCareBroadcastOffer,
    createAutoCareBroadcastRequest,
    createAutoCareFleet,
    createAutoCareFleetVehicle,
    createAutoCareGuaranteeClaim,
    getAutoCareFairPrice,
    getAutoCareBroadcastRequest,
    getAutoCareRepairTimeline,
} from './autocare-marketplace.service.js'

const client = { id: 'client-1', role: 'client' } as never
const owner = { id: 'owner-1', role: 'owner' } as never

describe('marketplace service identifier boundary', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('rejects malformed repair timeline and broadcast identifiers before repository access', async () => {
        await expect(getAutoCareRepairTimeline(client, 'request-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareBroadcastRequest(client, 'broadcast-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed broadcast offer identifiers before workspace lookup or transaction', async () => {
        await expect(createAutoCareBroadcastOffer(owner, 'broadcast-1', { locationId: '22222222-2222-4222-8222-222222222222' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareBroadcastOffer(owner, '11111111-1111-4111-8111-111111111111', { locationId: 'location-1' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed broadcast offer payloads before workspace lookup or transaction', async () => {
        const broadcastId = '11111111-1111-4111-8111-111111111111'
        await expect(createAutoCareBroadcastOffer(owner, broadcastId, { locationId: '22222222-2222-4222-8222-222222222222', amountMinor: Number.NaN, currencyCode: 'RUB' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareBroadcastOffer(owner, broadcastId, { locationId: '22222222-2222-4222-8222-222222222222', amountMinor: 2_000, currencyCode: 'RUB', unexpected: true } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
        expect(mocks.transaction).not.toHaveBeenCalled()
    })

    it('rejects malformed guarantee request and fleet identifiers before persistence', async () => {
        await expect(createAutoCareGuaranteeClaim(client, { requestId: 'request-1', claimType: 'quality', summary: 'A sufficiently detailed claim summary.' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareFleetVehicle(owner, 'fleet-1', { label: 'Fleet car', vehicleSnapshot: {} })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed guarantee claim payload before request lookup', async () => {
        const requestId = '11111111-1111-4111-8111-111111111111'
        const summary = 'A sufficiently detailed claim summary.'
        await expect(createAutoCareGuaranteeClaim(client, { requestId, claimType: 'unknown', summary })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareGuaranteeClaim(client, { requestId, claimType: 'quality', summary: 'short' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareGuaranteeClaim(client, { requestId, claimType: 'quality', summary, evidenceUrls: ['https://evil.example/evidence.jpg'] })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed fleet payloads before account or vehicle persistence', async () => {
        await expect(createAutoCareFleet(owner, { name: ' ' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareFleetVehicle(owner, '11111111-1111-4111-8111-111111111111', { label: 'Fleet car', vehicleSnapshot: { details: { vin: 'blocked' } } })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed broadcast payloads before catalog or persistence access', async () => {
        await expect(createAutoCareBroadcastRequest(client, { serviceDefinitionId: 'brake-pads', issueDescription: 'short' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareBroadcastRequest(client, { serviceDefinitionId: 'brake-pads', issueDescription: 'A sufficiently detailed broadcast description.', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, unsafe: true } })).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareBroadcastRequest(client, { serviceDefinitionId: 'brake-pads', issueDescription: 'A sufficiently detailed broadcast description.', preferredAt: 'tomorrow' })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed fair-price references and numeric filters before catalog access', async () => {
        await expect(getAutoCareFairPrice({ serviceId: '   ' })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareFairPrice({ serviceId: 'brake-pads', marketId: null as never })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareFairPrice({ serviceId: 'brake-pads', engineLiters: Number.NaN })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('trims fair-price service references before the first definition lookup', async () => {
        const definitionRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveServiceDefinitionEntity ? definitionRepository : undefined)

        await expect(getAutoCareFairPrice({ serviceId: '  brake-pads  ' })).resolves.toBeNull()
        expect(definitionRepository.findOneBy).toHaveBeenCalledWith({ slug: 'brake-pads' })
    })
})
