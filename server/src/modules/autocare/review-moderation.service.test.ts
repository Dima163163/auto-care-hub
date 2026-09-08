import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { decideAdminAutoCareReview, listAdminAutoCareReviews } from './review-moderation.service.js'

describe('automotive review moderation boundaries', () => {
    it('rejects non-admin users before reading the moderation queue', async () => {
        await expect(listAdminAutoCareReviews({ role: UserRole.Client } as never)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('accepts the regular admin role before validating the review payload', async () => {
        await expect(decideAdminAutoCareReview(
            { id: 'admin-1', role: UserRole.Admin } as never,
            'not-a-uuid',
            { status: 'rejected', reason: 'Нецензурная лексика' },
        )).rejects.toMatchObject({ statusCode: 422 })
    })

    it('accepts the super-admin role and requires a reason for blocking', async () => {
        await expect(decideAdminAutoCareReview(
            { id: 'super-admin-1', role: UserRole.SuperAdmin } as never,
            '11111111-1111-4111-8111-111111111111',
            { status: 'rejected' },
        )).rejects.toMatchObject({ statusCode: 422 })
    })
})
