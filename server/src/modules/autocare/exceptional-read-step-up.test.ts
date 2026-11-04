import type { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'

const mocks = vi.hoisted(() => ({ requireRecentPrivilegedMfa: vi.fn() }))
vi.mock('../auth/privileged-step-up.service.js', () => ({ requireRecentPrivilegedMfa: mocks.requireRecentPrivilegedMfa }))

import { requireExceptionalChatReadStepUp } from './exceptional-read-step-up.js'

const request = { headers: { authorization: 'Bearer access-token' } } as FastifyRequest

beforeEach(() => mocks.requireRecentPrivilegedMfa.mockReset())

describe('exceptional chat read step-up', () => {
    it.each([UserRole.Admin, UserRole.SuperAdmin])('requires current-session MFA for %s', async (role) => {
        const user = { role } as UserEntity
        mocks.requireRecentPrivilegedMfa.mockRejectedValueOnce(new Error('stale MFA'))
        await expect(requireExceptionalChatReadStepUp(request, user)).rejects.toThrow('stale MFA')
        expect(mocks.requireRecentPrivilegedMfa).toHaveBeenCalledExactlyOnceWith(request)
    })

    it.each([UserRole.Client, UserRole.Owner])('does not require admin step-up for %s', async (role) => {
        await expect(requireExceptionalChatReadStepUp(request, { role } as UserEntity)).resolves.toBeUndefined()
        expect(mocks.requireRecentPrivilegedMfa).not.toHaveBeenCalled()
    })
})
