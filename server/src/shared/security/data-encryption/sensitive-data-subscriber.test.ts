import { randomUUID } from 'node:crypto'
import type { InsertEvent, LoadEvent } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { createEmailBlindIndex, encryptFieldValue, encryptRecordBoundFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { SensitiveDataSubscriber } from './sensitive-data-subscriber.js'

const subscriber = new SensitiveDataSubscriber()

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'test-key',
        getIndexKey: () => Buffer.alloc(32, 73),
        getKey: () => ({ kek: Buffer.alloc(32, 19) }),
    })
})

afterEach(() => setDataEncryptionKeyProviderForTests(null))

function loadEmail<T extends UserEntity | AutomotiveProviderInvitationEntity>(entity: T, table: string) {
    subscriber.afterLoad(entity, { metadata: { tableName: table } } as LoadEvent<T>)
    return entity.email
}

function storedEmail<T extends UserEntity | AutomotiveProviderInvitationEntity>(entity: T, table: string, email: string) {
    entity.id = randomUUID()
    if (entity instanceof AutomotiveProviderInvitationEntity) entity.providerId = randomUUID()
    entity.email = createEmailBlindIndex(email)
    entity.emailCiphertext = JSON.stringify(encryptRecordBoundFieldValue(table, 'email', email, {
        rowId: entity.id,
        ...(entity instanceof AutomotiveProviderInvitationEntity ? { ownerId: entity.providerId } : {}),
    }))
    return entity
}

describe('encrypted identity index binding', () => {
    it('opens a user email only when its ciphertext matches the stored blind index', () => {
        const user = storedEmail(new UserEntity(), 'users', 'user@example.test')
        expect(loadEmail(user, 'users')).toBe('user@example.test')

        const swapped = storedEmail(new UserEntity(), 'users', 'other@example.test')
        swapped.emailCiphertext = JSON.stringify(encryptFieldValue('users', 'email', 'user@example.test'))
        expect(() => loadEmail(swapped, 'users')).toThrow('Encrypted users.email index authentication failed.')
    })

    it('rejects a missing index rather than exposing a partially selected identity', () => {
        const user = storedEmail(new UserEntity(), 'users', 'user@example.test')
        Reflect.deleteProperty(user, 'email')
        expect(() => loadEmail(user, 'users')).toThrow('Encrypted users.email index is invalid.')
    })

    it('applies the same binding to provider invitations', () => {
        const invitation = storedEmail(new AutomotiveProviderInvitationEntity(), 'autocare_provider_invitations', 'staff@example.test')
        expect(loadEmail(invitation, 'autocare_provider_invitations')).toBe('staff@example.test')

        const swapped = storedEmail(new AutomotiveProviderInvitationEntity(), 'autocare_provider_invitations', 'other@example.test')
        swapped.emailCiphertext = JSON.stringify(encryptFieldValue('autocare_provider_invitations', 'email', 'staff@example.test'))
        expect(() => loadEmail(swapped, 'autocare_provider_invitations'))
            .toThrow('Encrypted autocare_provider_invitations.email index authentication failed.')
    })

    it('rejects a complete ciphertext and index moved to another user row', () => {
        const source = storedEmail(new UserEntity(), 'users', 'source@example.test')
        const target = storedEmail(new UserEntity(), 'users', 'target@example.test')
        target.email = source.email
        target.emailCiphertext = source.emailCiphertext
        expect(() => loadEmail(target, 'users')).toThrow('Encrypted record binding authentication failed.')
    })

    it('rejects a complete pair moved to another invitation or provider', () => {
        const source = storedEmail(new AutomotiveProviderInvitationEntity(), 'autocare_provider_invitations', 'source@example.test')
        const target = storedEmail(new AutomotiveProviderInvitationEntity(), 'autocare_provider_invitations', 'target@example.test')
        target.email = source.email
        target.emailCiphertext = source.emailCiphertext
        expect(() => loadEmail(target, 'autocare_provider_invitations'))
            .toThrow('Encrypted record binding authentication failed.')

        target.id = source.id
        expect(() => loadEmail(target, 'autocare_provider_invitations'))
            .toThrow('Encrypted record binding authentication failed.')
    })

    it('writes a bound email after assigning the insert ID', () => {
        const user = new UserEntity()
        user.email = 'new@example.test'
        subscriber.beforeInsert({ metadata: { tableName: 'users' }, entity: user } as InsertEvent<UserEntity>)
        expect(user.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(JSON.parse(user.emailCiphertext)).toHaveProperty('recordBinding')
        user.email = createEmailBlindIndex('new@example.test')
        expect(loadEmail(user, 'users')).toBe('new@example.test')
    })

    it('keeps legacy rows readable during the expansion phase', () => {
        const user = storedEmail(new UserEntity(), 'users', 'legacy@example.test')
        user.emailCiphertext = JSON.stringify(encryptFieldValue('users', 'email', 'legacy@example.test'))
        expect(loadEmail(user, 'users')).toBe('legacy@example.test')
    })

    it('rejects legacy rows when strict binding is enabled', () => {
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING = 'true'
        try {
            const user = storedEmail(new UserEntity(), 'users', 'legacy@example.test')
            user.emailCiphertext = JSON.stringify(encryptFieldValue('users', 'email', 'legacy@example.test'))
            expect(() => loadEmail(user, 'users')).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_EMAIL_RECORD_BINDING = previous
        }
    })
})
