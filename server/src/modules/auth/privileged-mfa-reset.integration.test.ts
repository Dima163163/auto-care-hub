import { hash } from 'bcryptjs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { AuditAction, AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { SecurityEventEntity } from '../../entities/security-event/security-event.entity.js'
import { UserMfaFactorEntity } from '../../entities/user-mfa/user-mfa-factor.entity.js'
import { UserMfaRecoveryCodeEntity } from '../../entities/user-mfa/user-mfa-recovery-code.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { verifyAccessToken } from './auth-token.js'
import { loginUser } from './auth.service.js'
import { provisionPrivilegedMfa, resetPrivilegedMfa, verifyPrivilegedMfa } from './privileged-mfa.service.js'

describe('privileged MFA operator recovery integration', () => {
    const ids: string[] = []
    let target: UserEntity
    let first: UserEntity
    let second: UserEntity
    let targetCode: string
    let oldRecoveryCode: string
    let firstCode: string
    let secondCode: string
    const password = 'MfaResetIntegration-Password-2026!'

    beforeAll(async () => {
        const suffix = Date.now()
        const users = AppDataSource.getRepository(UserEntity)
        const passwordHash = await hash(password, 10)
        const create = async (name: string, role: UserRole) => {
            const user = await users.save(users.create({
                name,
                email: `mfa-reset-${name.toLowerCase()}-${suffix}@example.com`,
                role,
                status: UserStatus.Active,
                passwordHash,
                emailVerifiedAt: new Date(),
            }))
            ids.push(user.id)
            return user
        }
        target = await create('Target', UserRole.Admin)
        first = await create('First', UserRole.SuperAdmin)
        second = await create('Second', UserRole.SuperAdmin)
        const targetFactor = await provisionPrivilegedMfa(target.id)
        const firstFactor = await provisionPrivilegedMfa(first.id)
        const secondFactor = await provisionPrivilegedMfa(second.id)
        targetCode = targetFactor.recoveryCodes[0] ?? ''
        oldRecoveryCode = targetFactor.recoveryCodes[1] ?? ''
        firstCode = firstFactor.recoveryCodes[0] ?? ''
        secondCode = secondFactor.recoveryCodes[0] ?? ''
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        await AppDataSource.transaction(async (manager) => {
            await manager.query("SELECT set_config('app.audit_retention_cleanup', 'on', true)")
            await manager.query("SELECT set_config('app.security_event_retention_cleanup', 'on', true)")
            for (const id of ids) await manager.getRepository(AuditLogEntity).delete({ actorId: id })
            for (const id of ids) await manager.getRepository(SecurityEventEntity).delete({ userId: id })
        })
        for (const id of ids) {
            await AppDataSource.getRepository(UserSessionEntity).delete({ userId: id })
            await AppDataSource.getRepository(UserMfaRecoveryCodeEntity).delete({ userId: id })
            await AppDataSource.getRepository(UserMfaFactorEntity).delete({ userId: id })
            await AppDataSource.getRepository(UserEntity).delete({ id })
        }
    })

    it('requires two other super-admin proofs and atomically replaces the factor and sessions', async () => {
        const login = await loginUser({ email: target.email, password, mfaCode: targetCode })
        const sessionId = verifyAccessToken(login.accessToken).sessionId
        if (!sessionId) throw new Error('Expected a persisted session.')
        const before = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: target.id })

        await expect(resetPrivilegedMfa({
            targetUserId: target.id,
            approvals: [{ userId: first.id, code: firstCode }, { userId: first.id, code: secondCode }],
            ticketId: 'RESET-TEST-123',
        })).rejects.toThrow('Two distinct')

        await expect(resetPrivilegedMfa({
            targetUserId: target.id,
            approvals: [{ userId: first.id, code: firstCode }, { userId: second.id, code: 'BAD-CODE' }],
            ticketId: 'RESET-TEST-123',
        })).rejects.toThrow('not accepted')
        expect(await AppDataSource.getRepository(UserSessionEntity).findOneBy({ id: sessionId })).not.toBeNull()

        const replacement = await resetPrivilegedMfa({
            targetUserId: target.id,
            approvals: [{ userId: first.id, code: firstCode }, { userId: second.id, code: secondCode }],
            ticketId: 'RESET-TEST-123',
        })
        const after = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: target.id })
        expect(after.tokenVersion).toBe(before.tokenVersion + 1)
        expect(await AppDataSource.getRepository(UserSessionEntity).findOneBy({ id: sessionId })).toBeNull()
        expect(await verifyPrivilegedMfa(target.id, oldRecoveryCode)).toBe(false)
        expect(await verifyPrivilegedMfa(target.id, replacement.recoveryCodes[0] ?? '')).toBe(true)
        expect(await AppDataSource.getRepository(AuditLogEntity).countBy({
            actorId: first.id,
            action: AuditAction.MfaFactorReset,
            targetId: target.id,
        })).toBe(1)
    })
})
