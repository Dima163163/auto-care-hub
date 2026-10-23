import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    transaction: vi.fn(), requestFind: vi.fn(), claimFind: vi.fn(), claimSave: vi.fn(),
}))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { transaction: mocks.transaction } }))

import { AutoCareGuaranteeClaimEntity, ServiceRequestEntity } from '../../entities/index.js'
import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { createAutoCareGuaranteeClaim } from './autocare-marketplace.service.js'

const requestId = '11111111-1111-4111-8111-111111111111'
const clientId = '22222222-2222-4222-8222-222222222222'
const providerId = '33333333-3333-4333-8333-333333333333'
const summary = 'The agreed repair result was not delivered.'
const client = { id: clientId, role: UserRole.Client } as never
const input = { requestId, claimType: 'quality', summary, evidenceUrls: [] }

describe('guarantee case creation', () => {
    beforeEach(() => {
        mocks.requestFind.mockReset().mockResolvedValue({ id: requestId, clientId, providerId, status: ServiceRequestStatus.Closed })
        mocks.claimFind.mockReset().mockResolvedValue(null)
        mocks.claimSave.mockReset().mockImplementation(async (value) => ({
            ...value, id: 'claim-1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
        }))
        mocks.transaction.mockReset().mockImplementation(async (callback) => callback({
            getRepository: (entity: unknown) => entity === ServiceRequestEntity
                ? { findOne: mocks.requestFind }
                : entity === AutoCareGuaranteeClaimEntity
                    ? { findOne: mocks.claimFind, create: (value: unknown) => value, save: mocks.claimSave }
                    : undefined,
        }))
    })

    it('creates one case with a database uniqueness key and returns the same case on an identical retry', async () => {
        const first = await createAutoCareGuaranteeClaim(client, input)
        expect(first.id).toBe('claim-1')
        expect(mocks.claimSave).toHaveBeenCalledWith(expect.objectContaining({ caseKey: requestId }))

        mocks.claimFind.mockResolvedValue({
            ...input, id: 'claim-1', status: 'submitted', resolution: null,
            createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
        })
        const retry = await createAutoCareGuaranteeClaim(client, input)
        expect(retry.id).toBe(first.id)
        expect(mocks.claimSave).toHaveBeenCalledTimes(1)
    })

    it('rejects a different claim for the same request', async () => {
        mocks.claimFind.mockResolvedValue({ ...input, summary: 'Original account of the service' })
        await expect(createAutoCareGuaranteeClaim(client, input)).rejects.toMatchObject({ statusCode: 409 })
        expect(mocks.claimSave).not.toHaveBeenCalled()
    })

    it('rejects a claim before a confirmed booking', async () => {
        mocks.requestFind.mockResolvedValue({ id: requestId, clientId, providerId, status: ServiceRequestStatus.AwaitingReply })
        await expect(createAutoCareGuaranteeClaim(client, input)).rejects.toMatchObject({ statusCode: 409 })
        expect(mocks.claimSave).not.toHaveBeenCalled()
    })
})
