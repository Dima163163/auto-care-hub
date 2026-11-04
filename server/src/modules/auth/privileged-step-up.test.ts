import type { FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    findUserSession: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyPrivilegedMfa: vi.fn(),
    transaction: vi.fn(),
}))

vi.mock('./require-auth.js', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('./session.service.js', () => ({ findUserSession: mocks.findUserSession }))
vi.mock('./auth-token.js', () => ({ verifyAccessToken: mocks.verifyAccessToken }))
vi.mock('./privileged-mfa.service.js', () => ({ verifyPrivilegedMfa: mocks.verifyPrivilegedMfa }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { transaction: mocks.transaction } }))

import { PRIVILEGED_STEP_UP_MAX_AGE_MS, requireRecentPrivilegedMfa, stepUpPrivilegedSession } from './privileged-step-up.service.js'

const userId = '00000000-0000-4000-8000-000000000001'
const sessionId = '00000000-0000-4000-8000-000000000002'
const request = { headers: { authorization: 'Bearer access-token' } } as FastifyRequest
const now = 1_800_000_000_000

beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset()
    mocks.requireAuth.mockResolvedValue({ id: userId, role: 'admin' })
    mocks.verifyAccessToken.mockReturnValue({ userId, sessionId })
})

describe('privileged MFA step-up', () => {
    it('accepts only a recent verification on the current session', async () => {
        mocks.findUserSession.mockResolvedValue({ mfaVerifiedAt: new Date(now - PRIVILEGED_STEP_UP_MAX_AGE_MS) })
        await expect(requireRecentPrivilegedMfa(request, now)).resolves.toMatchObject({ id: userId })

        mocks.findUserSession.mockResolvedValue({ mfaVerifiedAt: new Date(now - PRIVILEGED_STEP_UP_MAX_AGE_MS - 1) })
        await expect(requireRecentPrivilegedMfa(request, now)).rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })

        mocks.findUserSession.mockResolvedValue({ mfaVerifiedAt: new Date(now + 1) })
        await expect(requireRecentPrivilegedMfa(request, now)).rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })
    })

    it('rejects a stale session before verifying a sensitive action', async () => {
        mocks.findUserSession.mockResolvedValue({ mfaVerifiedAt: null })
        await expect(requireRecentPrivilegedMfa(request, now)).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.findUserSession).toHaveBeenCalledWith(sessionId, userId)
    })

    it('updates assurance only after consuming a valid factor in the session transaction', async () => {
        const query = {
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            setLock: vi.fn().mockReturnThis(),
            getOne: vi.fn().mockResolvedValue({ expiresAt: new Date(now + 60_000) }),
        }
        const update = vi.fn().mockResolvedValue({ affected: 1 })
        const getRepository = vi.fn().mockReturnValue({ createQueryBuilder: () => query, update })
        const manager = { getRepository }
        mocks.transaction.mockImplementation(async (callback) => callback(manager))
        mocks.verifyPrivilegedMfa.mockResolvedValue(true)

        await expect(stepUpPrivilegedSession(request, '123456', now)).resolves.toMatchObject({ id: userId })
        expect(mocks.verifyPrivilegedMfa).toHaveBeenCalledWith(userId, '123456', now, manager)
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: sessionId, userId }), {
            mfaVerifiedAt: new Date(now),
        })

        mocks.verifyPrivilegedMfa.mockResolvedValue(false)
        update.mockClear()
        await expect(stepUpPrivilegedSession(request, '000000', now)).rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })
        expect(update).not.toHaveBeenCalled()

        mocks.verifyPrivilegedMfa.mockResolvedValue(true)
        update.mockResolvedValue({ affected: 0 })
        await expect(stepUpPrivilegedSession(request, '123456', now)).rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })
    })
})
