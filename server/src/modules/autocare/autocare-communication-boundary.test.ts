import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { updateOwnerAutoCareCommunicationSettings } from './autocare.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const settings = {
    teamSize: 'small_team',
    businessType: 'company',
    chatEnabled: true,
    communicationMode: 'online',
    responseWindowMinutes: 240,
    responseHours: 'working_hours',
    phoneBookingEnabled: true,
    callbackEnabled: true,
    requestPhotosEnabled: true,
    publicContactNote: null,
}

describe('communication service input boundary', () => {
    beforeEach(() => mocks.getRepository.mockReset())

    it('rejects malformed provider ids before owner lookup', async () => {
        await expect(updateOwnerAutoCareCommunicationSettings({ id: 'owner-1', role: 'owner' } as never, 'provider-1', settings)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects unknown or malformed communication fields before owner lookup', async () => {
        await expect(updateOwnerAutoCareCommunicationSettings({ id: 'owner-1', role: 'owner' } as never, providerId, { ...settings, ownerId: 'attacker' } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateOwnerAutoCareCommunicationSettings({ id: 'owner-1', role: 'owner' } as never, providerId, { ...settings, responseWindowMinutes: '240' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('uses the canonical provider id for the owner-scoped lookup', async () => {
        const providerRepository = { findOneBy: vi.fn().mockResolvedValue(null) }
        mocks.getRepository.mockReturnValue(providerRepository)

        await expect(updateOwnerAutoCareCommunicationSettings({ id: 'owner-1', role: 'owner' } as never, `  ${providerId.toUpperCase()}  `, settings)).rejects.toMatchObject({ statusCode: 404 })
        expect(providerRepository.findOneBy).toHaveBeenCalledWith({ id: providerId, ownerId: 'owner-1' })
    })
})
