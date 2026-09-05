import { describe, expect, it } from 'vitest'

import { AutomotiveProviderChangeRequestStatus } from '../../entities/automotive/provider-change-request.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    cancelOwnerProviderChangeRequest,
    createOwnerProviderChangeRequest,
    decideAdminProviderChangeRequest,
    listAdminProviderChangeRequests,
    listOwnerProviderChangeRequests,
} from './provider-change-request.service.js'

const owner = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Owner } as never
const client = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Client } as never
const admin = { id: '33333333-3333-4333-8333-333333333333', role: UserRole.Admin } as never

describe('Provider change request service boundaries', () => {
    it('enforces owner role before listing provider changes', async () => {
        await expect(listOwnerProviderChangeRequests(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 403 })
        await expect(listOwnerProviderChangeRequests(owner, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed provider change payloads before provider lookup', async () => {
        await expect(createOwnerProviderChangeRequest(owner, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerProviderChangeRequest(owner, '11111111-1111-4111-8111-111111111111', {
            kind: 'profile_update',
            payload: { unknownField: true },
        } as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed provider and request ids before cancellation lookup', async () => {
        await expect(cancelOwnerProviderChangeRequest(owner, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds admin change-request filters before repository access', async () => {
        await expect(listAdminProviderChangeRequests(admin, 'unknown' as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(listAdminProviderChangeRequests(client, 'unknown' as never)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('keeps admin authorization and id validation ahead of decision transaction', async () => {
        await expect(decideAdminProviderChangeRequest(client, 'not-a-uuid', AutomotiveProviderChangeRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminProviderChangeRequest(admin, 'not-a-uuid', AutomotiveProviderChangeRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 422 })
    })
})
