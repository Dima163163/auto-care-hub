import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import {
    acceptProviderInvitation,
    createOwnerProviderInvitation,
    listOwnerProviderMemberships,
    revokeOwnerProviderInvitation,
    revokeOwnerProviderMembership,
} from './provider-membership.service.js'

const owner = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.com', role: UserRole.Owner } as never
const client = { id: '22222222-2222-4222-8222-222222222222', email: 'client@example.com', role: UserRole.Client } as never

describe('Provider membership service boundaries', () => {
    it('rejects malformed provider ids before membership reads', async () => {
        await expect(listOwnerProviderMemberships(owner, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed invitation payloads before provider lookup', async () => {
        await expect(createOwnerProviderInvitation(owner, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createOwnerProviderInvitation(owner, '11111111-1111-4111-8111-111111111111', {
            email: 'staff@example.com',
            role: 'staff',
            locationId: 'not-a-uuid',
        } as never)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed invitation and membership ids before repository access', async () => {
        await expect(revokeOwnerProviderInvitation(owner, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
        await expect(revokeOwnerProviderMembership(owner, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed invitation tokens before opening a transaction', async () => {
        await expect(acceptProviderInvitation(client, 'short')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps owner authorization ahead of identifier and payload validation', async () => {
        await expect(listOwnerProviderMemberships(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 403 })
        await expect(createOwnerProviderInvitation(client, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 403 })
        await expect(revokeOwnerProviderInvitation(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 403 })
        await expect(revokeOwnerProviderMembership(client, 'not-a-uuid', 'not-a-uuid')).rejects.toMatchObject({ statusCode: 403 })
    })
})
