import { afterAll, describe, expect, it } from 'vitest'
import { AppDataSource } from '../../../database/data-source.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../../entities/outbox/outbox-event.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../../entities/user/user.entity.js'

describe('sensitive field encryption ORM integration', () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const email = `field-encryption-${suffix}@example.test`
    const providerSubject = `oauth-private-subject-${suffix}`
    let userId: string | undefined
    let oauthIdentityId: string | undefined
    let outboxEventId: string | undefined

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (outboxEventId) await AppDataSource.getRepository(OutboxEventEntity).delete({ id: outboxEventId })
        if (userId) {
            await AppDataSource.getRepository(OAuthIdentityEntity).delete({ userId })
            await AppDataSource.getRepository(UserEntity).delete({ id: userId })
        }
    })

    it('stores private identity and outbox values as ciphertext while preserving application reads', async () => {
        const users = AppDataSource.getRepository(UserEntity)
        const user = await users.save(users.create({
            name: `Private Name ${suffix}`,
            email,
            phone: '+7 999 123-45-67',
            preferredCity: 'Казань',
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'test-password-hash',
        }))
        userId = user.id

        const rawUser = await AppDataSource.query(
            'SELECT "email", "emailCiphertext", "name", "phone" FROM "users" WHERE "id" = $1',
            [user.id],
        ) as Array<{ email: string; emailCiphertext: string; name: string; phone: string }>
        expect(rawUser[0].email).not.toContain(email)
        expect(rawUser[0].email).toMatch(/^h1_[A-Za-z0-9_-]{43}$/)
        expect(rawUser[0].emailCiphertext).not.toContain(email)
        expect(rawUser[0].name).not.toContain(`Private Name ${suffix}`)
        expect(rawUser[0].phone).not.toContain('+7 999 123-45-67')

        const loadedUser = await users.findOneByOrFail({ email })
        expect(loadedUser.email).toBe(email)
        expect(loadedUser.name).toBe(`Private Name ${suffix}`)
        expect(loadedUser.phone).toBe('+7 999 123-45-67')
        expect(loadedUser.preferredCity).toBe('Казань')

        const identities = AppDataSource.getRepository(OAuthIdentityEntity)
        const identity = await identities.save(identities.create({
            provider: OAuthIdentityProvider.Google,
            providerSubject,
            userId: user.id,
        }))
        oauthIdentityId = identity.id
        const rawIdentity = await AppDataSource.query(
            'SELECT "provider_subject", "provider_subject_ciphertext" FROM "oauth_identities" WHERE "id" = $1',
            [identity.id],
        ) as Array<{ provider_subject: string; provider_subject_ciphertext: string }>
        expect(rawIdentity[0].provider_subject).not.toContain(providerSubject)
        expect(rawIdentity[0].provider_subject_ciphertext).not.toContain(providerSubject)
        const loadedIdentity = await identities.findOneByOrFail({
            provider: OAuthIdentityProvider.Google,
            providerSubject,
        })
        expect(loadedIdentity.providerSubject).toBe(providerSubject)

        const outbox = AppDataSource.getRepository(OutboxEventEntity)
        const outboxEvent = await outbox.save(outbox.create({
            type: 'field-encryption.integration',
            payload: { email, recipientName: `Private Name ${suffix}` },
            status: OutboxEventStatus.Pending,
            idempotencyKey: `field-encryption-${suffix}`,
        }))
        outboxEventId = outboxEvent.id
        const rawOutbox = await AppDataSource.query(
            'SELECT "payload" FROM "outbox_events" WHERE "id" = $1',
            [outboxEvent.id],
        ) as Array<{ payload: { email: string; emailCiphertext: unknown; recipientName: string | null; recipientNameCiphertext: unknown } }>
        expect(JSON.stringify(rawOutbox[0].payload)).not.toContain(email)
        expect(JSON.stringify(rawOutbox[0].payload)).not.toContain(`Private Name ${suffix}`)
        expect(rawOutbox[0].payload.recipientName).toBeNull()
        expect(rawOutbox[0].payload.emailCiphertext).toBeDefined()
        expect(rawOutbox[0].payload.recipientNameCiphertext).toBeDefined()
        const loadedOutbox = await outbox.findOneByOrFail({ id: outboxEvent.id })
        expect(loadedOutbox.payload).toMatchObject({ email, recipientName: `Private Name ${suffix}` })
        expect(loadedOutbox.payload).not.toHaveProperty('emailCiphertext')
    })
})
