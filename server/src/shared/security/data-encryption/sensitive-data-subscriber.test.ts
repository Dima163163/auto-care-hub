import type { LoadEvent } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { createEmailBlindIndex, encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
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
    entity.email = createEmailBlindIndex(email)
    entity.emailCiphertext = JSON.stringify(encryptFieldValue(table, 'email', email))
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
})
