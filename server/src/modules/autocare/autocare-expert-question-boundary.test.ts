import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { UserRole } from '../../entities/user/user.entity.js'
import { createAutoCareExpertQuestion } from './autocare-marketplace.service.js'

describe('AutoCare expert question service boundary', () => {
    const repository = {
        create: vi.fn(),
        save: vi.fn(),
    }

    beforeEach(() => {
        mocks.getRepository.mockReset()
        repository.create.mockReset()
        repository.save.mockReset()
        mocks.getRepository.mockReturnValue(repository)
        repository.create.mockImplementation((value) => ({
            ...value,
            id: 'question-1',
            createdAt: new Date('2026-09-03T10:00:00.000Z'),
            updatedAt: new Date('2026-09-03T10:00:00.000Z'),
        }))
        repository.save.mockImplementation(async (value) => value)
    })

    it('rejects malformed direct calls before touching the repository', async () => {
        await expect(createAutoCareExpertQuestion(
            { id: 'client-1', role: UserRole.Client } as never,
            { symptoms: 'short', categorySlug: 'engine', vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, extra: 'blocked' } },
        )).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('persists only canonicalized expert-question fields', async () => {
        const result = await createAutoCareExpertQuestion(
            { id: 'client-1', role: UserRole.Client } as never,
            {
                symptoms: '  Мотор глохнет после прогрева  ',
                categorySlug: '  engine-diagnostics  ',
                vehicleSnapshot: { make: ' BMW ', model: ' Ｘ５ ', year: 2021, vin: ' wba1234567890abcd ' },
            },
        )

        expect(repository.create).toHaveBeenCalledWith({
            clientId: 'client-1',
            symptoms: 'Мотор глохнет после прогрева',
            categorySlug: 'engine-diagnostics',
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 'WBA1234567890ABCD' },
            status: 'open',
            answer: null,
            answeredById: null,
            answeredAt: null,
        })
        expect(result).toMatchObject({
            id: 'question-1',
            symptoms: 'Мотор глохнет после прогрева',
            categorySlug: 'engine-diagnostics',
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021, vin: 'WBA1234567890ABCD' },
            status: 'open',
        })
    })
})
