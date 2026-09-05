import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    createOwnerAutoCareCapacityResource,
    getOwnerAutoCareCapacityReservations,
    getOwnerAutoCareCapacityResources,
    updateOwnerAutoCareCapacityResource,
} from './autocare.service.js'

describe('capacity service input boundaries', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('rejects malformed provider/location and reservation query values before authorization', async () => {
        await expect(getOwnerAutoCareCapacityResources({ id: 'staff-1' } as never, 'provider-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerAutoCareCapacityResources({ id: 'staff-1' } as never, '11111111-1111-4111-8111-111111111111', 'location-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerAutoCareCapacityReservations({ id: 'staff-1' } as never, 'provider-1', {})).rejects.toMatchObject({ statusCode: 422 })
        await expect(getOwnerAutoCareCapacityReservations({ id: 'staff-1' } as never, '11111111-1111-4111-8111-111111111111', { from: '2026-08-31' })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed resource create/update inputs before opening a transaction', async () => {
        await expect(createOwnerAutoCareCapacityResource({ id: 'owner-1' } as never, 'provider-1', { locationId: 'location-1', type: 'bay', name: 'Bay', capacity: 1, active: true, metadata: {} } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerAutoCareCapacityResource({ id: 'owner-1' } as never, 'provider-1', 'resource-1', {})).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.transaction).not.toHaveBeenCalled()
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
