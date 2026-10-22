import { describe, expect, it, vi } from 'vitest'
import type { EntityManager } from 'typeorm'

import { AutoCareChatThreadType } from '../../entities/automotive/service-request.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { assertChatMessageWriteAccess } from './chat-write-policy.js'
import { lockRequestChatThreadForWrite } from './request-access.service.js'

describe('private conversation write policy', () => {
    it.each([UserRole.Admin, UserRole.SuperAdmin])('denies %s in private request chats', (role) => {
        expect(() => assertChatMessageWriteAccess({ role }, { type: AutoCareChatThreadType.ServiceRequest }))
            .toThrowError(expect.objectContaining({ statusCode: 403 }))
    })

    it.each([UserRole.Admin, UserRole.SuperAdmin])('allows %s in support and escalation chats', (role) => {
        expect(() => assertChatMessageWriteAccess({ role }, { type: AutoCareChatThreadType.Support })).not.toThrow()
        expect(() => assertChatMessageWriteAccess({ role }, { type: AutoCareChatThreadType.AdminEscalation })).not.toThrow()
    })

    it.each([UserRole.Client, UserRole.Owner])('allows %s in private request chats', (role) => {
        expect(() => assertChatMessageWriteAccess({ role }, { type: AutoCareChatThreadType.ServiceRequest })).not.toThrow()
    })

    it('rejects an admin at the shared request write boundary before creating a thread', async () => {
        const getRepository = vi.fn()
        await expect(lockRequestChatThreadForWrite(
            { getRepository } as unknown as EntityManager,
            { id: 'request-1' } as never,
            { role: UserRole.SuperAdmin } as never,
        )).rejects.toMatchObject({ statusCode: 403 })
        expect(getRepository).not.toHaveBeenCalled()
    })
})
