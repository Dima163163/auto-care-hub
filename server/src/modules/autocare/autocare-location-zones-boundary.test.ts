import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { AutomotiveMarketEntity, AutomotiveLocationZoneEntity } from '../../entities/index.js'
import { getAutoCareLocationZones } from './autocare.service.js'

const parentId = '11111111-1111-4111-8111-111111111111'

describe('public location zones input boundary', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed market and parent references before repository access', async () => {
        await expect(getAutoCareLocationZones('   ')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareLocationZones('moscow', 'zone-1')).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects unsafe limits and coordinates before querying the catalog', async () => {
        await expect(getAutoCareLocationZones('moscow', undefined, undefined, 0)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareLocationZones('moscow', undefined, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareLocationZones('moscow', undefined, [] as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareLocationZones('moscow', undefined, { latitude: 91, longitude: 37.6 })).rejects.toMatchObject({ statusCode: 422 })
        await expect(getAutoCareLocationZones('moscow', undefined, { latitude: 55.7, longitude: Number.NaN })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('trims a market code before fallback lookup', async () => {
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveMarketEntity ? marketRepository : undefined)

        const zones = await getAutoCareLocationZones('  moscow  ')
        expect(zones).toEqual(expect.any(Array))
        expect(marketRepository.findOneBy).toHaveBeenCalledWith({ cityCode: 'moscow' })
    })

    it('uses canonical parent UUID in the database zone query', async () => {
        const marketRepository = { findOneBy: vi.fn().mockResolvedValue({ id: 'market-1', cityCode: 'unknown-market' }) }
        const zoneRepository = { find: vi.fn().mockResolvedValue([]) }
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutomotiveMarketEntity) return marketRepository
            if (entity === AutomotiveLocationZoneEntity) return zoneRepository
            return undefined
        })

        await expect(getAutoCareLocationZones('unknown-market', ` ${parentId.toUpperCase()} `)).resolves.toEqual([])
        expect(zoneRepository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { marketId: 'market-1', parentId, active: true } }))
    })
})
