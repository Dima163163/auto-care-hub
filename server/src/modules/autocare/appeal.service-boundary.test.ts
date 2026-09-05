import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    createAutoCareAppeal,
    decideAdminAutoCareAppeal,
    getPendingAutoCareAppealCount,
    listAdminAutoCareAppeals,
    withdrawAutoCareAppeal,
} from './appeal.service.js'

const admin = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Admin } as never
const client = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Client } as never

describe('AutoCare appeal service boundaries', () => {
    it('rejects malformed create payloads and references before repository access', async () => {
        await expect(createAutoCareAppeal(client, null)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareAppeal(client, {
            subject: 'provider',
            subjectId: 'not-a-uuid',
            reason: 'This appeal reason is sufficiently detailed for validation.',
        })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed withdrawal ids before opening a transaction', async () => {
        await expect(withdrawAutoCareAppeal(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds admin list queries before repository access', async () => {
        await expect(listAdminAutoCareAppeals(admin, { limit: 101 })).rejects.toMatchObject({ statusCode: 422 })
        await expect(listAdminAutoCareAppeals(admin, { status: 'unknown' })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps admin authorization ahead of decision input validation', async () => {
        await expect(decideAdminAutoCareAppeal(client, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminAutoCareAppeal(admin, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps admin authorization ahead of pending-count repository access', async () => {
        await expect(getPendingAutoCareAppealCount(client)).rejects.toMatchObject({ statusCode: 403 })
    })
})
