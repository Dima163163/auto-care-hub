import { afterAll, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { AppDataSource } from '../../../database/data-source.js'
import { AutomotiveProviderEntity } from '../../../entities/automotive/automotive.entity.js'
import { AutomotiveProviderInvitationEntity, AutomotiveProviderInvitationRole, AutomotiveProviderInvitationStatus } from '../../../entities/automotive/provider-invitation.entity.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../../entities/outbox/outbox-event.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../../entities/user-session/user-session.entity.js'
import { loginUser } from '../../../modules/auth/auth.service.js'
import { createOwnerProviderInvitation } from '../../../modules/autocare/provider-membership.service.js'
import { getDataEncryptionKeyProvider, setDataEncryptionKeyProviderForTests } from './field-encryption.js'

describe('sensitive field encryption ORM integration', () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const email = `field-encryption-${suffix}@example.test`
    const providerSubject = `oauth-private-subject-${suffix}`
    let userId: string | undefined
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
        const storedUser = rawUser[0]
        if (!storedUser) throw new Error('Synthetic encrypted user was not stored.')
        expect(storedUser.email).not.toContain(email)
        expect(storedUser.email).toMatch(/^h1_[A-Za-z0-9_-]{43}$/)
        expect(storedUser.emailCiphertext).not.toContain(email)
        expect(storedUser.name).not.toContain(`Private Name ${suffix}`)
        expect(storedUser.phone).not.toContain('+7 999 123-45-67')

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
        const rawIdentity = await AppDataSource.query(
            'SELECT "provider_subject", "provider_subject_ciphertext" FROM "oauth_identities" WHERE "id" = $1',
            [identity.id],
        ) as Array<{ provider_subject: string; provider_subject_ciphertext: string }>
        const storedIdentity = rawIdentity[0]
        if (!storedIdentity) throw new Error('Synthetic encrypted identity was not stored.')
        expect(storedIdentity.provider_subject).not.toContain(providerSubject)
        expect(storedIdentity.provider_subject_ciphertext).not.toContain(providerSubject)
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
        const storedOutbox = rawOutbox[0]
        if (!storedOutbox) throw new Error('Synthetic encrypted outbox event was not stored.')
        expect(JSON.stringify(storedOutbox.payload)).not.toContain(email)
        expect(JSON.stringify(storedOutbox.payload)).not.toContain(`Private Name ${suffix}`)
        expect(storedOutbox.payload.recipientName).toBeNull()
        expect(storedOutbox.payload.emailCiphertext).toBeDefined()
        expect(storedOutbox.payload.recipientNameCiphertext).toBeDefined()
        const loadedOutbox = await outbox.findOneByOrFail({ id: outboxEvent.id })
        expect(loadedOutbox.payload).toMatchObject({ email, recipientName: `Private Name ${suffix}` })
        expect(loadedOutbox.payload).not.toHaveProperty('emailCiphertext')
    })

    it('preserves password login, OAuth, email uniqueness and invitation conflicts after KEK rotation', async () => {
        const originalProvider = getDataEncryptionKeyProvider()
        const nextKeyId = `synthetic-rotation-${suffix}`
        const rotatingProvider = {
            activeKeyId: originalProvider.activeKeyId,
            getIndexKey: () => originalProvider.getIndexKey(),
            getKey: (keyId: string) => keyId === nextKeyId
                ? { kek: Buffer.alloc(32, 29) }
                : originalProvider.getKey(keyId),
        }
        const rotationEmail = `rotation-${suffix}@example.test`
        const invitationEmail = `rotation-staff-${suffix}@example.test`
        const rotationSubject = `rotation-subject-${suffix}`
        const password = 'Synthetic-rotation-password-42!'
        let rotationUserId: string | undefined
        let rotationProviderId: string | undefined
        setDataEncryptionKeyProviderForTests(rotatingProvider)

        try {
            const users = AppDataSource.getRepository(UserEntity)
            const owner = await users.save(users.create({
                name: 'Synthetic rotation owner', email: rotationEmail,
                role: UserRole.Owner, status: UserStatus.Active,
                passwordHash: await hash(password, 10), emailVerifiedAt: new Date(),
            }))
            rotationUserId = owner.id
            const identities = AppDataSource.getRepository(OAuthIdentityEntity)
            const identity = await identities.save(identities.create({
                provider: OAuthIdentityProvider.Google, providerSubject: rotationSubject, userId: owner.id,
            }))
            const providers = AppDataSource.getRepository(AutomotiveProviderEntity)
            const provider = await providers.save(providers.create({ ownerId: owner.id, name: `Rotation garage ${suffix}` }))
            rotationProviderId = provider.id
            const invitations = AppDataSource.getRepository(AutomotiveProviderInvitationEntity)
            const invitation = await invitations.save(invitations.create({
                providerId: provider.id, email: invitationEmail, locationId: null,
                role: AutomotiveProviderInvitationRole.Staff, status: AutomotiveProviderInvitationStatus.Pending,
                tokenHash: createHash('sha256').update(suffix).digest('hex'), invitedById: owner.id,
                expiresAt: new Date(Date.now() + 86_400_000), acceptedAt: null, revokedAt: null,
            }))

            rotatingProvider.activeKeyId = nextKeyId
            const login = await loginUser({ email: rotationEmail.toUpperCase(), password })
            expect(login.user.id).toBe(owner.id)
            expect(login.user.email).toBe(rotationEmail)
            expect(login.accessToken).toEqual(expect.any(String))
            const loadedIdentity = await identities.findOneByOrFail({
                provider: OAuthIdentityProvider.Google, providerSubject: rotationSubject,
            })
            expect(loadedIdentity.id).toBe(identity.id)
            expect(loadedIdentity.providerSubject).toBe(rotationSubject)
            await expect(users.save(users.create({
                name: 'Synthetic duplicate', email: rotationEmail.toUpperCase(),
                role: UserRole.Client, status: UserStatus.Active, passwordHash: 'synthetic-hash',
            }))).rejects.toMatchObject({ driverError: { code: '23505' } })
            expect(await users.countBy({ email: rotationEmail })).toBe(1)
            expect((await invitations.findOneByOrFail({ email: invitationEmail, providerId: provider.id })).id)
                .toBe(invitation.id)
            await expect(createOwnerProviderInvitation(owner, provider.id, {
                email: invitationEmail.toUpperCase(), role: AutomotiveProviderInvitationRole.Staff, locationId: null,
            })).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
            expect(await invitations.countBy({ providerId: provider.id })).toBe(1)

            const loadedUser = await users.findOneByOrFail({ id: owner.id })
            loadedUser.name = 'Synthetic owner after rotation'
            await users.save(loadedUser)
            const rows = await AppDataSource.query(
                'SELECT "name", "emailCiphertext" FROM "users" WHERE "id" = $1', [owner.id],
            ) as Array<{ name: string; emailCiphertext: string }>
            const row = rows[0]
            if (!row) throw new Error('Synthetic rotated user was not stored.')
            expect(JSON.parse(row.name)).toMatchObject({ keyId: nextKeyId })
            expect(JSON.parse(row.emailCiphertext)).toMatchObject({ keyId: nextKeyId })
            expect((await users.findOneByOrFail({ email: rotationEmail })).name).toBe('Synthetic owner after rotation')
        } finally {
            try {
                if (rotationProviderId) {
                    await AppDataSource.getRepository(AutomotiveProviderInvitationEntity).delete({ providerId: rotationProviderId })
                    await AppDataSource.getRepository(AutomotiveProviderEntity).delete({ id: rotationProviderId })
                }
                if (rotationUserId) {
                    await AppDataSource.getRepository(UserSessionEntity).delete({ userId: rotationUserId })
                    await AppDataSource.getRepository(OAuthIdentityEntity).delete({ userId: rotationUserId })
                    await AppDataSource.getRepository(UserEntity).delete({ id: rotationUserId })
                }
            } finally {
                setDataEncryptionKeyProviderForTests(null)
            }
        }
    })
})
