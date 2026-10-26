import { afterAll, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { hash } from 'bcryptjs'
import { AppDataSource } from '../../../database/data-source.js'
import { AutomotiveProviderEntity } from '../../../entities/automotive/automotive.entity.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadType, ServiceMessageEntity, ServiceMessageKind } from '../../../entities/automotive/service-request.entity.js'
import { AutomotiveProviderInvitationEntity, AutomotiveProviderInvitationRole, AutomotiveProviderInvitationStatus } from '../../../entities/automotive/provider-invitation.entity.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../../entities/outbox/outbox-event.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../../entities/user-session/user-session.entity.js'
import { loginUser } from '../../../modules/auth/auth.service.js'
import { createOwnerProviderInvitation } from '../../../modules/autocare/provider-membership.service.js'
import { createBlindIndex, createEmailBlindIndex, encryptFieldValue, getDataEncryptionKeyProvider, outboxPayloadEncryptionTransformer, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetEmailBindingBackfill, runIdentityEmailBindingBackfill, verifyIdentityEmailBindings } from './identity-email-binding-backfill.js'
import { resetOutboxBindingBackfill, runOutboxBindingBackfill, verifyOutboxBindings } from './outbox-binding-backfill.js'
import { resetOAuthBindingBackfill, runOAuthBindingBackfill, verifyOAuthBindings } from './oauth-binding-backfill.js'
import { resetUserProfileBindingBackfill, runUserProfileBindingBackfill, verifyUserProfileBindings } from './user-profile-binding-backfill.js'
import { resetMessageBodyBindingBackfill, runMessageBodyBindingBackfill, verifyMessageBodyBindings } from './message-body-binding-backfill.js'

describe('sensitive field encryption ORM integration', () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const email = `field-encryption-${suffix}@example.test`
    const providerSubject = `oauth-private-subject-${suffix}`
    let userId: string | undefined
    let secondUserId: string | undefined
    let outboxEventId: string | undefined
    let secondOutboxEventId: string | undefined

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        if (outboxEventId) await AppDataSource.getRepository(OutboxEventEntity).delete({ id: outboxEventId })
        if (secondOutboxEventId) await AppDataSource.getRepository(OutboxEventEntity).delete({ id: secondOutboxEventId })
        if (secondUserId) await AppDataSource.getRepository(UserEntity).delete({ id: secondUserId })
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
            'SELECT "email", "emailCiphertext", "name", "phone", "nameBinding", "phoneBinding" FROM "users" WHERE "id" = $1',
            [user.id],
        ) as Array<{ email: string; emailCiphertext: string; name: string; phone: string; nameBinding: string; phoneBinding: string }>
        const storedUser = rawUser[0]
        if (!storedUser) throw new Error('Synthetic encrypted user was not stored.')
        expect(storedUser.email).not.toContain(email)
        expect(storedUser.email).toMatch(/^h1_[A-Za-z0-9_-]{43}$/)
        expect(storedUser.emailCiphertext).not.toContain(email)
        expect(storedUser.name).not.toContain(`Private Name ${suffix}`)
        expect(storedUser.phone).not.toContain('+7 999 123-45-67')
        expect(storedUser.nameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(storedUser.phoneBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)

        const loadedUser = await users.findOneByOrFail({ email })
        expect(loadedUser.email).toBe(email)
        expect(loadedUser.name).toBe(`Private Name ${suffix}`)
        expect(loadedUser.phone).toBe('+7 999 123-45-67')
        expect(loadedUser.preferredCity).toBe('Казань')

        const secondUser = await users.save(users.create({
            name: `Other Private Name ${suffix}`,
            email: `other-${email}`,
            phone: '+7 999 765-43-21',
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'test-password-hash',
        }))
        secondUserId = secondUser.id
        const [secondStoredUser] = await AppDataSource.query(
            'SELECT "name", "phone" FROM "users" WHERE "id" = $1', [secondUser.id],
        ) as Array<{ name: string; phone: string }>
        if (!secondStoredUser) throw new Error('Second synthetic encrypted user was not stored.')
        await AppDataSource.query('UPDATE "users" SET "name" = $1 WHERE "id" = $2', [storedUser.name, secondUser.id])
        try {
            await expect(users.findOneByOrFail({ id: secondUser.id }))
                .rejects.toThrow('Encrypted record binding authentication failed.')
        } finally {
            await AppDataSource.query('UPDATE "users" SET "name" = $1 WHERE "id" = $2', [secondStoredUser.name, secondUser.id])
        }
        await AppDataSource.query('UPDATE "users" SET "phone" = $1 WHERE "id" = $2', [storedUser.phone, secondUser.id])
        try {
            await expect(users.findOneByOrFail({ id: secondUser.id }))
                .rejects.toThrow('Encrypted record binding authentication failed.')
        } finally {
            await AppDataSource.query('UPDATE "users" SET "phone" = $1 WHERE "id" = $2', [secondStoredUser.phone, secondUser.id])
        }

        await AppDataSource.query('UPDATE "users" SET "nameBinding" = NULL, "phoneBinding" = NULL WHERE "id" = $1', [user.id])
        await resetUserProfileBindingBackfill(AppDataSource)
        try {
            expect((await runUserProfileBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyUserProfileBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await users.findOneByOrFail({ id: user.id })).name).toBe(`Private Name ${suffix}`)
            const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING
            process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING = 'true'
            try {
                const partial = await users.findOneOrFail({
                    where: { id: user.id }, select: { id: true, name: true, nameBinding: true },
                })
                expect(partial.name).toBe(`Private Name ${suffix}`)
                await expect(users.findOneOrFail({ where: { id: user.id }, select: { id: true, name: true } }))
                    .rejects.toThrow('Encrypted record binding is missing.')
            } finally {
                if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING
                else process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING = previousStrict
            }
        } finally {
            await resetUserProfileBindingBackfill(AppDataSource)
        }

        const wrongEmailCiphertext = JSON.stringify(encryptFieldValue('users', 'email', `other-${email}`))
        await AppDataSource.query('UPDATE "users" SET "emailCiphertext" = $1 WHERE "id" = $2', [wrongEmailCiphertext, user.id])
        try {
            await expect(users.findOneByOrFail({ id: user.id }))
                .rejects.toThrow('Encrypted users.email index authentication failed.')
        } finally {
            await AppDataSource.query('UPDATE "users" SET "emailCiphertext" = $1 WHERE "id" = $2', [storedUser.emailCiphertext, user.id])
        }

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
        expect(JSON.parse(storedIdentity.provider_subject_ciphertext)).toHaveProperty('recordBinding')
        const loadedIdentity = await identities.findOneByOrFail({
            provider: OAuthIdentityProvider.Google,
            providerSubject,
        })
        expect(loadedIdentity.providerSubject).toBe(providerSubject)

        const secondIdentity = await identities.save(identities.create({
            provider: OAuthIdentityProvider.Google,
            providerSubject: `other-${providerSubject}`,
            userId: user.id,
        }))
        const [secondStoredIdentity] = await AppDataSource.query(
            'SELECT "provider_subject", "provider_subject_ciphertext" FROM "oauth_identities" WHERE "id" = $1',
            [secondIdentity.id],
        ) as Array<{ provider_subject: string; provider_subject_ciphertext: string }>
        if (!secondStoredIdentity) throw new Error('Second encrypted OAuth identity was not stored.')
        await AppDataSource.query('UPDATE "oauth_identities" SET "provider_subject" = $1 WHERE "id" = $2', [
            createBlindIndex(`temporary-${providerSubject}`, 'oauth-provider-subject'), identity.id,
        ])
        try {
            await AppDataSource.query(
                'UPDATE "oauth_identities" SET "provider_subject" = $1, "provider_subject_ciphertext" = $2 WHERE "id" = $3',
                [storedIdentity.provider_subject, storedIdentity.provider_subject_ciphertext, secondIdentity.id],
            )
            await expect(identities.findOneByOrFail({ id: secondIdentity.id }))
                .rejects.toThrow('Encrypted record binding authentication failed.')
        } finally {
            await AppDataSource.query(
                'UPDATE "oauth_identities" SET "provider_subject" = $1, "provider_subject_ciphertext" = $2 WHERE "id" = $3',
                [secondStoredIdentity.provider_subject, secondStoredIdentity.provider_subject_ciphertext, secondIdentity.id],
            )
            await AppDataSource.query('UPDATE "oauth_identities" SET "provider_subject" = $1 WHERE "id" = $2', [
                storedIdentity.provider_subject, identity.id,
            ])
        }

        await AppDataSource.query('UPDATE "oauth_identities" SET "provider_subject_ciphertext" = $1 WHERE "id" = $2', [
            JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', providerSubject)), identity.id,
        ])
        await resetOAuthBindingBackfill(AppDataSource)
        try {
            expect((await runOAuthBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyOAuthBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            const [backfilled] = await AppDataSource.query(
                'SELECT "provider_subject_ciphertext" FROM "oauth_identities" WHERE "id" = $1', [identity.id],
            ) as Array<{ provider_subject_ciphertext: string }>
            expect(JSON.parse(backfilled?.provider_subject_ciphertext ?? '{}')).toHaveProperty('recordBinding')
            expect((await identities.findOneByOrFail({ id: identity.id })).providerSubject).toBe(providerSubject)
        } finally {
            await resetOAuthBindingBackfill(AppDataSource)
        }

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
        expect(storedOutbox.payload.emailCiphertext).toHaveProperty('recordBinding')
        expect(storedOutbox.payload.recipientNameCiphertext).toHaveProperty('recordBinding')
        expect((storedOutbox.payload as Record<string, unknown>).$recordId).toBe(outboxEvent.id)
        const loadedOutbox = await outbox.findOneByOrFail({ id: outboxEvent.id })
        expect(loadedOutbox.payload).toMatchObject({ email, recipientName: `Private Name ${suffix}` })
        expect(loadedOutbox.payload).not.toHaveProperty('emailCiphertext')

        const secondOutboxEvent = await outbox.save(outbox.create({
            type: 'field-encryption.integration',
            payload: { email: `other-${email}`, recipientName: `Other Private Name ${suffix}` },
            status: OutboxEventStatus.Pending,
            idempotencyKey: `field-encryption-other-${suffix}`,
        }))
        secondOutboxEventId = secondOutboxEvent.id
        const [secondRaw] = await AppDataSource.query('SELECT "payload" FROM "outbox_events" WHERE "id" = $1', [secondOutboxEvent.id]) as Array<{ payload: Record<string, unknown> }>
        if (!secondRaw) throw new Error('Second encrypted outbox event was not stored.')
        await AppDataSource.query('UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2', [JSON.stringify(storedOutbox.payload), secondOutboxEvent.id])
        try {
            await expect(outbox.findOneByOrFail({ id: secondOutboxEvent.id }))
                .rejects.toThrow('Encrypted outbox record binding authentication failed.')
        } finally {
            await AppDataSource.query('UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2', [JSON.stringify(secondRaw.payload), secondOutboxEvent.id])
        }

        const wrongOutboxPayload = { ...storedOutbox.payload, email: createEmailBlindIndex(`other-${email}`) }
        await AppDataSource.query('UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2', [JSON.stringify(wrongOutboxPayload), outboxEvent.id])
        try {
            await expect(outbox.findOneByOrFail({ id: outboxEvent.id }))
                .rejects.toThrow('Encrypted outbox email index authentication failed.')
        } finally {
            await AppDataSource.query('UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2', [JSON.stringify(storedOutbox.payload), outboxEvent.id])
        }
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

            await AppDataSource.query(
                'UPDATE "autocare_provider_invitations" SET "emailCiphertext" = $1 WHERE "id" = $2',
                [JSON.stringify(encryptFieldValue('autocare_provider_invitations', 'email', invitationEmail)), invitation.id],
            )
            await resetEmailBindingBackfill(AppDataSource, 'autocare_provider_invitations')
            expect((await runIdentityEmailBindingBackfill(AppDataSource, 'autocare_provider_invitations', {
                batchSize: 500, maxBatches: 10_000,
            })).exhausted).toBe(true)
            expect((await verifyIdentityEmailBindings(AppDataSource, 'autocare_provider_invitations', {
                batchSize: 500, maxBatches: 10_000,
            })).exhausted).toBe(true)

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
            expect(JSON.parse(row.emailCiphertext)).toMatchObject({ keyId: nextKeyId, recordBinding: expect.stringMatching(/^r1_[A-Za-z0-9_-]{43}$/) })
            expect((await users.findOneByOrFail({ email: rotationEmail })).name).toBe('Synthetic owner after rotation')
        } finally {
            try {
                await resetEmailBindingBackfill(AppDataSource, 'autocare_provider_invitations')
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

    it('rejects moving a matching email index and ciphertext to another user row', async () => {
        const users = AppDataSource.getRepository(UserEntity)
        const left = await users.save(users.create({
            name: 'Synthetic left user', email: `left-${suffix}@example.test`,
            role: UserRole.Client, status: UserStatus.Active, passwordHash: 'synthetic-hash',
        }))
        let rightId: string | undefined
        try {
            const right = await users.save(users.create({
                name: 'Synthetic right user', email: `right-${suffix}@example.test`,
                role: UserRole.Client, status: UserStatus.Active, passwordHash: 'synthetic-hash',
            }))
            rightId = right.id
            const source = await AppDataSource.query(
                'SELECT "email", "emailCiphertext" FROM "users" WHERE "id" = $1', [left.id],
            ) as Array<{ email: string; emailCiphertext: string }>
            const original = await AppDataSource.query(
                'SELECT "email", "emailCiphertext" FROM "users" WHERE "id" = $1', [right.id],
            ) as Array<{ email: string; emailCiphertext: string }>
            if (!source[0] || !original[0]) throw new Error('Synthetic encrypted email rows are missing.')
            expect(JSON.parse(source[0].emailCiphertext)).toHaveProperty('recordBinding')
            await users.delete({ id: left.id })
            await AppDataSource.query(
                'UPDATE "users" SET "email" = $1, "emailCiphertext" = $2 WHERE "id" = $3',
                [source[0].email, source[0].emailCiphertext, right.id],
            )
            try {
                await expect(users.findOneByOrFail({ id: right.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query(
                    'UPDATE "users" SET "email" = $1, "emailCiphertext" = $2 WHERE "id" = $3',
                    [original[0].email, original[0].emailCiphertext, right.id],
                )
            }
        } finally {
            if (rightId) await users.delete({ id: rightId })
            await users.delete({ id: left.id })
        }
    })

    it('backfills legacy email records in bounded batches and supports strict reads', async () => {
        const users = AppDataSource.getRepository(UserEntity)
        const legacyEmail = `legacy-binding-${suffix}@example.test`
        const user = await users.save(users.create({
            name: 'Synthetic legacy binding user', email: legacyEmail,
            role: UserRole.Client, status: UserStatus.Active, passwordHash: 'synthetic-hash',
        }))
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING
        try {
            await AppDataSource.query(
                'UPDATE "users" SET "emailCiphertext" = $1 WHERE "id" = $2',
                [JSON.stringify(encryptFieldValue('users', 'email', legacyEmail)), user.id],
            )
            await resetEmailBindingBackfill(AppDataSource, 'users')
            await expect(verifyIdentityEmailBindings(AppDataSource, 'users', { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            await runIdentityEmailBindingBackfill(AppDataSource, 'users', { batchSize: 1, maxBatches: 1 })
            const completed = await runIdentityEmailBindingBackfill(AppDataSource, 'users', { batchSize: 500, maxBatches: 10_000 })
            expect(completed.exhausted).toBe(true)
            expect((await verifyIdentityEmailBindings(AppDataSource, 'users', { batchSize: 500, maxBatches: 10_000 })).exhausted)
                .toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING = 'true'
            expect((await users.findOneByOrFail({ id: user.id })).email).toBe(legacyEmail)
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING = previous
            await resetEmailBindingBackfill(AppDataSource, 'users')
            await users.delete({ id: user.id })
        }
    })

    it('backfills legacy outbox recipients and supports strict reads', async () => {
        const outbox = AppDataSource.getRepository(OutboxEventEntity)
        const legacyEmail = `legacy-outbox-binding-${suffix}@example.test`
        const event = await outbox.save(outbox.create({
            type: 'field-encryption.integration',
            payload: { email: legacyEmail, recipientName: 'Legacy Client' },
            status: OutboxEventStatus.Pending,
            idempotencyKey: `legacy-outbox-binding-${suffix}`,
        }))
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
        try {
            const legacyPayload = outboxPayloadEncryptionTransformer.to({ email: legacyEmail, recipientName: 'Legacy Client' })
            await AppDataSource.query('UPDATE "outbox_events" SET "payload" = $1::jsonb WHERE "id" = $2',
                [JSON.stringify(legacyPayload), event.id])
            await resetOutboxBindingBackfill(AppDataSource)
            await expect(verifyOutboxBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted outbox record binding authentication failed.')
            process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = 'true'
            await expect(outbox.findOneByOrFail({ id: event.id }))
                .rejects.toThrow('Encrypted outbox record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
            const completed = await runOutboxBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })
            expect(completed.exhausted).toBe(true)
            expect((await verifyOutboxBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = 'true'
            expect((await outbox.findOneByOrFail({ id: event.id })).payload).toMatchObject({
                email: legacyEmail,
                recipientName: 'Legacy Client',
            })
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_OUTBOX_RECORD_BINDING = previous
            await resetOutboxBindingBackfill(AppDataSource)
            await outbox.delete({ id: event.id })
        }
    })

    it('binds message bodies to their rows, backfills legacy bodies and clears bindings on deletion', async () => {
        const users = AppDataSource.getRepository(UserEntity)
        const threads = AppDataSource.getRepository(AutoCareChatThreadEntity)
        const messages = AppDataSource.getRepository(ServiceMessageEntity)
        const user = await users.save(users.create({
            name: 'Synthetic chat sender', email: `chat-binding-${suffix}@example.test`,
            role: UserRole.Client, status: UserStatus.Active, passwordHash: 'synthetic-hash',
        }))
        const threadIds: string[] = []
        const messageIds: string[] = []
        const previousStrict = process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
        try {
            const thread = await threads.save(threads.create({
                type: AutoCareChatThreadType.Support, requestId: null, providerId: null,
                clientId: user.id, createdById: user.id, subject: 'Synthetic private chat',
            }))
            const threadId = thread.id
            threadIds.push(threadId)
            const otherThread = await threads.save(threads.create({
                type: AutoCareChatThreadType.Support, requestId: null, providerId: null,
                clientId: user.id, createdById: user.id, subject: 'Other synthetic private chat',
            }))
            threadIds.push(otherThread.id)
            const source = await messages.save(messages.create({
                requestId: null, threadId, senderId: user.id, kind: ServiceMessageKind.Text,
                body: 'Source private message', offer: null,
            }))
            const target = await messages.save(messages.create({
                requestId: null, threadId, senderId: user.id, kind: ServiceMessageKind.Text,
                body: 'Target private message', offer: null,
            }))
            messageIds.push(source.id, target.id)
            const [storedSource] = await AppDataSource.query(
                'SELECT "body", "bodyBinding" FROM "autocare_service_messages" WHERE "id" = $1', [source.id],
            ) as Array<{ body: string; bodyBinding: string }>
            const [storedTarget] = await AppDataSource.query(
                'SELECT "body", "bodyBinding" FROM "autocare_service_messages" WHERE "id" = $1', [target.id],
            ) as Array<{ body: string; bodyBinding: string }>
            if (!storedSource || !storedTarget) throw new Error('Synthetic encrypted chat messages are missing.')
            expect(storedSource.body).not.toContain('Source private message')
            expect(storedSource.bodyBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
            await AppDataSource.query('UPDATE "autocare_service_messages" SET "body" = $1 WHERE "id" = $2', [storedSource.body, target.id])
            try {
                await expect(messages.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query('UPDATE "autocare_service_messages" SET "body" = $1 WHERE "id" = $2', [storedTarget.body, target.id])
            }
            await AppDataSource.query('UPDATE "autocare_service_messages" SET "threadId" = $1 WHERE "id" = $2', [otherThread.id, target.id])
            try {
                await expect(messages.findOneByOrFail({ id: target.id }))
                    .rejects.toThrow('Encrypted record binding authentication failed.')
            } finally {
                await AppDataSource.query('UPDATE "autocare_service_messages" SET "threadId" = $1 WHERE "id" = $2', [threadId, target.id])
            }

            await AppDataSource.query('UPDATE "autocare_service_messages" SET "bodyBinding" = NULL WHERE "id" = $1', [source.id])
            await resetMessageBodyBindingBackfill(AppDataSource)
            await expect(verifyMessageBodyBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 }))
                .rejects.toThrow('Encrypted record binding is missing.')
            process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING = 'true'
            await expect(messages.findOneByOrFail({ id: source.id }))
                .rejects.toThrow('Encrypted record binding is missing.')
            delete process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
            expect((await runMessageBodyBindingBackfill(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            expect((await verifyMessageBodyBindings(AppDataSource, { batchSize: 500, maxBatches: 10_000 })).exhausted).toBe(true)
            process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING = 'true'
            expect((await messages.findOneByOrFail({ id: source.id })).body).toBe('Source private message')

            const deleted = await messages.findOneByOrFail({ id: target.id })
            deleted.body = null
            deleted.deletedAt = new Date()
            await messages.save(deleted)
            const [storedDeleted] = await AppDataSource.query(
                'SELECT "body", "bodyBinding" FROM "autocare_service_messages" WHERE "id" = $1', [target.id],
            ) as Array<{ body: string | null; bodyBinding: string | null }>
            expect(storedDeleted).toMatchObject({ body: null, bodyBinding: null })
        } finally {
            if (previousStrict === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING = previousStrict
            await resetMessageBodyBindingBackfill(AppDataSource)
            if (messageIds.length) await messages.delete(messageIds)
            if (threadIds.length) await threads.delete(threadIds)
            await users.delete({ id: user.id })
        }
    })
})
