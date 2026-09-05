import { describe, expect, it, vi } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: vi.fn(),
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
})
