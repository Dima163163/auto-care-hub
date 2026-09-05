import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { appendAutoCareRepairEvent } from './autocare-marketplace.service.js'

describe('AutoCare repair event service boundary', () => {
    const repository = {
        create: vi.fn(),
        save: vi.fn(),
    }

    beforeEach(() => {
        mocks.getRepository.mockReset()
        repository.create.mockReset()
        repository.save.mockReset()
        mocks.getRepository.mockReturnValue(repository)
        repository.create.mockImplementation((value) => ({ ...value, id: 'event-1', createdAt: new Date('2026-09-03T10:00:00.000Z') }))
        repository.save.mockImplementation(async (value) => value)
    })

    it('rejects malformed direct calls before repository access', async () => {
        await expect(appendAutoCareRepairEvent({ requestId: 'request-1', eventType: 'completed', title: 'Визит завершён' })).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('persists only canonicalized event fields', async () => {
        const requestId = '11111111-1111-4111-8111-111111111111'
        const actorId = '22222222-2222-4222-8222-222222222222'
        const result = await appendAutoCareRepairEvent({
            requestId: ` ${requestId.toUpperCase()} `,
            actorId: ` ${actorId.toUpperCase()} `,
            eventType: '  COMPLETED  ',
            title: '  Визит завершён  ',
            notes: '  Работы приняты  ',
            metadata: { source: '  owner  ' },
        })

        expect(repository.create).toHaveBeenCalledWith({
            requestId,
            actorId,
            eventType: 'completed',
            title: 'Визит завершён',
            notes: 'Работы приняты',
            metadata: { source: 'owner' },
        })
        expect(result).toMatchObject({ id: 'event-1', requestId, actorId, eventType: 'completed', title: 'Визит завершён' })
    })
})
