import { randomUUID } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import { afterAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { updateUserPreferences } from '../users/users.service.js'
import { changePassword } from './auth.service.js'

describe('user security writes on PostgreSQL', () => {
    const userIds: string[] = []

    async function createUser() {
        const repository = AppDataSource.getRepository(UserEntity)
        const user = await repository.save(repository.create({
            name: 'Security concurrency fixture',
            email: `security-concurrency-${randomUUID()}@example.test`,
            passwordHash: await hash('original-password-123', 4),
            role: UserRole.Client,
            status: UserStatus.Active,
            emailVerifiedAt: new Date(),
        }))
        userIds.push(user.id)
        return user
    }

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        for (const userId of userIds) {
            await AppDataSource.getRepository(UserSessionEntity).delete({ userId })
            await AppDataSource.getRepository(UserEntity).delete(userId)
        }
    })

    it('does not restore a blocked account or an older password from a preference snapshot', async () => {
        const snapshot = await createUser()
        const replacementHash = await hash('replacement-password-123', 4)
        const repository = AppDataSource.getRepository(UserEntity)
        await repository.update(snapshot.id, {
            status: UserStatus.Blocked,
            passwordHash: replacementHash,
            tokenVersion: snapshot.tokenVersion + 1,
        })

        await expect(updateUserPreferences(snapshot, { locale: 'de' }))
            .rejects.toMatchObject({ statusCode: 401 })

        const stored = await repository.findOneByOrFail({ id: snapshot.id })
        expect(stored.status).toBe(UserStatus.Blocked)
        expect(stored.passwordHash).toBe(replacementHash)
        expect(stored.tokenVersion).toBe(snapshot.tokenVersion + 1)
        expect(stored.locale).toBeNull()
    })

    it('allows only one password change from the same session version', async () => {
        const snapshot = await createUser()
        const input = { oldPassword: 'original-password-123', newPassword: 'next-password-123' }
        const results = await Promise.allSettled([
            changePassword(snapshot, input),
            changePassword(snapshot, { ...input, newPassword: 'alternate-password-123' }),
        ])

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
        const rejected = results.find((result) => result.status === 'rejected')
        expect(rejected?.status === 'rejected' ? rejected.reason : null)
            .toMatchObject({ statusCode: 401 })

        const stored = await AppDataSource.getRepository(UserEntity).findOneByOrFail({ id: snapshot.id })
        expect(stored.status).toBe(UserStatus.Active)
        expect(stored.tokenVersion).toBe(snapshot.tokenVersion + 1)
        expect(await compare('original-password-123', stored.passwordHash ?? '')).toBe(false)
        const validNewPasswords = await Promise.all([
            compare('next-password-123', stored.passwordHash ?? ''),
            compare('alternate-password-123', stored.passwordHash ?? ''),
        ])
        expect(validNewPasswords.filter(Boolean)).toHaveLength(1)
    })
})
