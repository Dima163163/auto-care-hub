import { hash } from 'bcryptjs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { SecurityEventEntity } from '../../entities/security-event/security-event.entity.js'
import { UserMfaFactorEntity } from '../../entities/user-mfa/user-mfa-factor.entity.js'
import { UserMfaRecoveryCodeEntity } from '../../entities/user-mfa/user-mfa-recovery-code.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { verifyAccessToken, verifyRefreshToken } from './auth-token.js'
import { completePasswordSetup, createPasswordSetupTokenForUser, loginUser, refreshAuth } from './auth.service.js'
import { provisionPrivilegedMfa } from './privileged-mfa.service.js'
import { generateTotpCode } from './totp.js'
import { requireRecentPrivilegedMfa, stepUpPrivilegedSession } from './privileged-step-up.service.js'
import type { FastifyRequest } from 'fastify'

describe('privileged MFA login integration', () => {
    let userId: string
    let email: string
    let secret: string
    let recoveryCode: string
    let setupRecoveryCode: string
    let stepUpRecoveryCode: string
    let provisionedStepUpLoginCode: string
    const password = 'MfaIntegration-Password-2026!'

    beforeAll(async () => {
        email = `privileged-mfa-${Date.now()}@example.com`
        const users = AppDataSource.getRepository(UserEntity)
        const user = await users.save(users.create({
            name: 'Privileged MFA Integration',
            email,
            role: UserRole.Admin,
            status: UserStatus.Active,
            passwordHash: await hash(password, 10),
            emailVerifiedAt: new Date(),
        }))
        userId = user.id
        const provisioned = await provisionPrivilegedMfa(userId)
        secret = provisioned.secret
        recoveryCode = provisioned.recoveryCodes[0] ?? ''
        setupRecoveryCode = provisioned.recoveryCodes[1] ?? ''
        stepUpRecoveryCode = provisioned.recoveryCodes[2] ?? ''
        provisionedStepUpLoginCode = provisioned.recoveryCodes[3] ?? ''
    })

    afterAll(async () => {
        if (!userId || !AppDataSource.isInitialized) return
        await AppDataSource.transaction(async (manager) => {
            await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
            await manager.query("SELECT set_config('app.security_event_retention_cleanup', 'on', true)")
            await manager.getRepository(AuditLogEntity).delete({ actorId: userId })
            await manager.getRepository(SecurityEventEntity).delete({ userId })
        })
        await AppDataSource.getRepository(UserSessionEntity).delete({ userId })
        await AppDataSource.getRepository(UserMfaRecoveryCodeEntity).delete({ userId })
        await AppDataSource.getRepository(UserMfaFactorEntity).delete({ userId })
        await AppDataSource.getRepository(UserEntity).delete({ id: userId })
    })

    it('requires a second factor, consumes a time step once, and preserves assurance on refresh', async () => {
        const counter = Math.floor(Date.now() / 30_000)
        const mfaCode = generateTotpCode(secret, counter)
        await expect(loginUser({ email, password })).rejects.toMatchObject({ statusCode: 401 })

        const login = await loginUser({ email, password, mfaCode })
        const payload = verifyRefreshToken(login.refreshToken)
        const session = await AppDataSource.getRepository(UserSessionEntity).findOneByOrFail({ id: payload.sessionId })
        expect(session.mfaVerifiedAt).toBeInstanceOf(Date)

        await expect(loginUser({ email, password, mfaCode })).rejects.toMatchObject({ statusCode: 401 })

        const refreshed = await refreshAuth(userId, payload.tokenVersion, payload.sessionId)
        const rotatedPayload = verifyRefreshToken(refreshed.refreshToken)
        const rotated = await AppDataSource.getRepository(UserSessionEntity).findOneByOrFail({ id: rotatedPayload.sessionId })
        expect(rotated.mfaVerifiedAt?.getTime()).toBe(session.mfaVerifiedAt?.getTime())
    })

    it('consumes each recovery code only once', async () => {
        const login = await loginUser({ email, password, mfaCode: recoveryCode })
        expect(login.accessToken).toBeTruthy()
        await expect(loginUser({ email, password, mfaCode: recoveryCode }))
            .rejects.toMatchObject({ statusCode: 401 })
    })

    it('requires MFA before a privileged password setup token creates a session', async () => {
        const user = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: userId })
        const setup = await createPasswordSetupTokenForUser(user)
        await expect(completePasswordSetup({ token: setup.token, password }))
            .rejects.toMatchObject({ statusCode: 401 })

        const completed = await completePasswordSetup({
            token: setup.token,
            password,
            mfaCode: setupRecoveryCode,
        })
        const payload = verifyRefreshToken(completed.refreshToken)
        const session = await AppDataSource.getRepository(UserSessionEntity).findOneByOrFail({ id: payload.sessionId })
        expect(session.mfaVerifiedAt).toBeInstanceOf(Date)
    })

    it('requires a fresh proof for sensitive actions and consumes a step-up recovery code once', async () => {
        const login = await loginUser({ email, password, mfaCode: provisionedStepUpLoginCode })
        const sessionId = verifyAccessToken(login.accessToken).sessionId
        if (!sessionId) throw new Error('Expected a persisted privileged session.')
        await AppDataSource.getRepository(UserSessionEntity).update(
            { id: sessionId },
            { mfaVerifiedAt: new Date(Date.now() - 10 * 60_000) },
        )
        const request = { headers: { authorization: `Bearer ${login.accessToken}` } } as FastifyRequest
        await expect(requireRecentPrivilegedMfa(request)).rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })
        await stepUpPrivilegedSession(request, stepUpRecoveryCode)
        await expect(requireRecentPrivilegedMfa(request)).resolves.toMatchObject({ id: userId })
        await expect(stepUpPrivilegedSession(request, stepUpRecoveryCode))
            .rejects.toMatchObject({ code: 'MFA_STEP_UP_REQUIRED' })
    })
})
