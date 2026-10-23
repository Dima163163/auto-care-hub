import { describe, expect, it, vi } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

const mocks = vi.hoisted(() => ({
    transaction: vi.fn(),
    reset: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: vi.fn(),
        transaction: mocks.transaction,
    },
}))

const { updateSuperAdminTrustPolicy } = await import('./super-admin-trust-policy.service.js')

describe('super-admin trust policy service boundary', () => {
    it('rejects malformed direct payloads before repository access', async () => {
        const actor = { id: 'admin-1', role: UserRole.SuperAdmin } as UserEntity
        await expect(updateSuperAdminTrustPolicy(actor, {
            policyVersion: 'autocare-trust-v1',
            trustedMinimumRating: 4.2,
            trustedMinimumReviews: 5,
            trustedMinimumCompletedVisits: 10,
            trustedMaxNoShowRate: 0.1,
            trustedMaxComplaintRate: 0.1,
            trustedMaxResponseTimeMinutes: 120,
            reassessmentIntervalHours: 24,
            rollout: { enabled: false, marketIds: [], percentage: 10 },
            permissions: ['super-admin'],
        })).rejects.toMatchObject({ statusCode: 422, code: ERROR_CODES.ValidationError })
    })

    it('invalidates provider scan watermarks when scoring policy changes', async () => {
        const actor = { id: 'admin-1', role: UserRole.SuperAdmin } as UserEntity
        const input = {
            policyVersion: 'autocare-trust-v2',
            trustedMinimumRating: 4.2,
            trustedMinimumReviews: 5,
            trustedMinimumCompletedVisits: 10,
            trustedMaxNoShowRate: 0.1,
            trustedMaxComplaintRate: 0.1,
            trustedMaxResponseTimeMinutes: 120,
            reassessmentIntervalHours: 24,
            rollout: { enabled: false, marketIds: [], percentage: 10 },
        }
        const entity = {
            ...input,
            policyVersion: 'autocare-trust-v1',
            rolloutEnabled: false,
            rolloutMarketIds: [],
            rolloutPercentage: 10,
            updatedAt: new Date(),
        }
        const query = {
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            execute: mocks.reset.mockResolvedValue({ affected: 2 }),
        }
        const repository = {
            findOneBy: vi.fn().mockResolvedValue(entity),
            save: vi.fn().mockImplementation(async (value) => value),
            createQueryBuilder: vi.fn().mockReturnValue(query),
        }
        mocks.transaction.mockImplementation(async (task) => task({ getRepository: () => repository }))

        await updateSuperAdminTrustPolicy(actor, input)

        expect(query.set).toHaveBeenCalledWith({
            trustReassessedAt: null,
            trustReassessmentAttemptedAt: null,
        })
        expect(query.where).toHaveBeenCalledWith('status = :status', { status: 'active' })
        expect(mocks.reset).toHaveBeenCalledOnce()
    })
})
