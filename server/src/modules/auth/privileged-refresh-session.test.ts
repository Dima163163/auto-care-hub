import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { AppDataSource } from '../../database/data-source.js'
import { refreshAuth } from './auth.service.js'

const refreshMocks = vi.hoisted(() => ({
    rotateUserSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    recordAuditLog: vi.fn(),
    recordSecurityEvent: vi.fn(),
    enqueueSecurityNotificationSafely: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({
    AppDataSource: { getRepository: vi.fn() },
}))
vi.mock('./session.service.js', () => ({
    rotateUserSession: refreshMocks.rotateUserSession,
    revokeAllUserSessions: refreshMocks.revokeAllUserSessions,
    createUserSession: vi.fn(),
}))
vi.mock('../admin/audit-log.service.js', () => ({ recordAuditLog: refreshMocks.recordAuditLog }))
vi.mock('./security-event-stream.js', () => ({ recordSecurityEvent: refreshMocks.recordSecurityEvent }))
vi.mock('../outbox/security-notification-outbox.js', () => ({
    enqueueSecurityNotificationSafely: refreshMocks.enqueueSecurityNotificationSafely,
}))

const userId = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
    vi.mocked(AppDataSource.getRepository).mockReset()
    for (const fn of Object.values(refreshMocks)) fn.mockReset().mockResolvedValue(undefined)
})

describe('privileged refresh sessions', () => {
    it.each([UserRole.Admin, UserRole.SuperAdmin])('rejects a sessionless refresh for %s', async (role) => {
        const findOne = vi.fn().mockResolvedValue({
            id: userId,
            role,
            status: UserStatus.Active,
            tokenVersion: 1,
        })
        vi.mocked(AppDataSource.getRepository).mockReturnValue({ findOne } as ReturnType<typeof AppDataSource.getRepository>)

        await expect(refreshAuth(userId, 1)).rejects.toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED',
        })
    })

    it('keeps refresh reuse detection active when a privileged session has disappeared', async () => {
        const findOne = vi.fn()
            .mockResolvedValueOnce({
                id: userId,
                role: UserRole.Admin,
                status: UserStatus.Active,
                tokenVersion: 1,
            })
            .mockResolvedValueOnce(null)
        vi.mocked(AppDataSource.getRepository).mockReturnValue({ findOne } as ReturnType<typeof AppDataSource.getRepository>)
        refreshMocks.rotateUserSession.mockResolvedValue(null)

        await expect(refreshAuth(userId, 1, 'expired-session-id')).rejects.toMatchObject({
            statusCode: 401,
            code: 'UNAUTHORIZED',
        })
        expect(refreshMocks.rotateUserSession).toHaveBeenCalledWith('expired-session-id', userId)
        expect(refreshMocks.revokeAllUserSessions).toHaveBeenCalledWith(userId)
        expect(refreshMocks.recordSecurityEvent).toHaveBeenCalledOnce()
    })
})
