import { randomUUID } from 'node:crypto'
import type { InsertEvent, LoadEvent, UpdateEvent } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { OutboxEventEntity } from '../../../entities/outbox/outbox-event.entity.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { ServiceMessageEntity, ServiceMessageKind } from '../../../entities/automotive/service-request.entity.js'
import { createBlindIndex, createEmailBlindIndex, encryptFieldValue, encryptRecordBoundFieldValue, getOutboxPayloadRecordId, isEmailBlindIndex, outboxPayloadEncryptionTransformer, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
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

describe('encrypted outbox record binding', () => {
    function storedEvent(email: string) {
        const event = new OutboxEventEntity()
        event.payload = { email, recipientName: 'Private Client' }
        subscriber.beforeInsert({ metadata: { tableName: 'outbox_events' }, entity: event } as InsertEvent<OutboxEventEntity>)
        const stored = outboxPayloadEncryptionTransformer.to(event.payload) as Record<string, unknown>
        return { event, stored }
    }

    function loadEvent(id: string, stored: Record<string, unknown>) {
        const event = new OutboxEventEntity()
        event.id = id
        event.payload = outboxPayloadEncryptionTransformer.from(stored) as Record<string, unknown>
        subscriber.afterLoad(event, { metadata: { tableName: 'outbox_events' } } as LoadEvent<OutboxEventEntity>)
        return event
    }

    it('binds both encrypted fields to the event UUID', () => {
        const { event, stored } = storedEvent('source@example.test')
        expect(stored.emailCiphertext).toHaveProperty('recordBinding')
        expect(stored.recipientNameCiphertext).toHaveProperty('recordBinding')
        expect(loadEvent(event.id, stored).payload).toMatchObject({ email: 'source@example.test', recipientName: 'Private Client' })
    })

    it('sets the scope before TypeORM transforms an ORM insert', () => {
        const event = new OutboxEventEntity()
        const payload = { email: 'orm@example.test', $recordId: randomUUID() }
        event.payload = payload
        expect(getOutboxPayloadRecordId(payload)).toBe(event.id)
        const stored = outboxPayloadEncryptionTransformer.to(event.payload) as Record<string, unknown>
        expect(stored.$recordId).toBe(event.id)
        expect(stored.emailCiphertext).toHaveProperty('recordBinding')
        expect(JSON.stringify(event)).not.toContain('_payload')
        expect(JSON.stringify(event)).not.toContain('$recordId')
    })

    it('rejects a complete payload moved to another event', () => {
        const source = storedEvent('source@example.test')
        const target = storedEvent('target@example.test')
        expect(() => loadEvent(target.event.id, source.stored))
            .toThrow('Encrypted outbox record binding authentication failed.')
    })

    it('rejects a ciphertext and blind index moved without its record marker', () => {
        const source = storedEvent('source@example.test')
        const target = storedEvent('target@example.test')
        const swapped = {
            ...target.stored,
            email: source.stored.email,
            emailCiphertext: source.stored.emailCiphertext,
        }
        expect(() => loadEvent(target.event.id, swapped)).toThrow('Encrypted record binding authentication failed.')
        const swappedName = { ...target.stored, recipientNameCiphertext: source.stored.recipientNameCiphertext }
        expect(() => loadEvent(target.event.id, swappedName)).toThrow('Encrypted record binding authentication failed.')
    })

    it('keeps a legacy event readable during expansion', () => {
        const id = randomUUID()
        const stored = outboxPayloadEncryptionTransformer.to({ email: 'legacy@example.test' }) as Record<string, unknown>
        expect(loadEvent(id, stored).payload).toMatchObject({ email: 'legacy@example.test' })
    })
})

describe('encrypted OAuth subject record binding', () => {
    function storedIdentity(subject: string, provider = OAuthIdentityProvider.Google) {
        const identity = new OAuthIdentityEntity()
        identity.provider = provider
        identity.providerSubject = subject
        identity.userId = randomUUID()
        subscriber.beforeInsert({ metadata: { tableName: 'oauth_identities' }, entity: identity } as InsertEvent<OAuthIdentityEntity>)
        identity.providerSubject = createBlindIndex(subject, 'oauth-provider-subject')
        return identity
    }

    function loadIdentity(identity: OAuthIdentityEntity) {
        subscriber.afterLoad(identity, { metadata: { tableName: 'oauth_identities' } } as LoadEvent<OAuthIdentityEntity>)
        return identity.providerSubject
    }

    it('writes a bound subject and opens it on the matching identity', () => {
        const identity = storedIdentity('private-subject')
        expect(JSON.parse(identity.providerSubjectCiphertext)).toHaveProperty('recordBinding')
        expect(loadIdentity(identity)).toBe('private-subject')
    })

    it('rejects a complete index and ciphertext moved across rows, owners or providers', () => {
        const source = storedIdentity('private-source')
        const target = storedIdentity('private-target')
        target.providerSubject = source.providerSubject
        target.providerSubjectCiphertext = source.providerSubjectCiphertext
        expect(() => loadIdentity(target)).toThrow('Encrypted record binding authentication failed.')
        target.id = source.id
        expect(() => loadIdentity(target)).toThrow('Encrypted record binding authentication failed.')
        target.userId = source.userId
        target.provider = OAuthIdentityProvider.Yandex
        expect(() => loadIdentity(target)).toThrow('Encrypted record binding authentication failed.')
    })

    it('reads old authenticated subjects during expansion', () => {
        const identity = storedIdentity('legacy-subject')
        identity.providerSubjectCiphertext = JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', 'legacy-subject'))
        expect(loadIdentity(identity)).toBe('legacy-subject')
    })

    it('rejects an old subject after strict cutover', () => {
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING = 'true'
        try {
            const identity = storedIdentity('legacy-subject')
            identity.providerSubjectCiphertext = JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', 'legacy-subject'))
            expect(() => loadIdentity(identity)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_OAUTH_RECORD_BINDING = previous
        }
    })
})

describe('encrypted user profile record binding', () => {
    function storedUser(name: string, phone: string | null) {
        const user = new UserEntity()
        user.email = `${randomUUID()}@example.test`
        user.name = name
        user.phone = phone
        subscriber.beforeInsert({ metadata: { tableName: 'users' }, entity: user } as InsertEvent<UserEntity>)
        user.email = createEmailBlindIndex(user.email)
        return user
    }

    function loadUser(user: UserEntity) {
        if (!isEmailBlindIndex(user.email)) user.email = createEmailBlindIndex(user.email)
        subscriber.afterLoad(user, { metadata: { tableName: 'users' } } as LoadEvent<UserEntity>)
        return user
    }

    it('binds name and phone to the user ID and rejects swapped values', () => {
        const source = storedUser('Source Name', '+79991111111')
        const target = storedUser('Target Name', '+79992222222')
        expect(source.nameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(source.phoneBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(loadUser(source).name).toBe('Source Name')
        target.name = source.name
        expect(() => loadUser(target)).toThrow('Encrypted record binding authentication failed.')
        target.name = 'Target Name'
        target.phone = source.phone
        expect(() => loadUser(target)).toThrow('Encrypted record binding authentication failed.')
    })

    it('accepts null phone and rejects a binding without a value', () => {
        const user = storedUser('Private Name', null)
        expect(user.phoneBinding).toBeNull()
        expect(loadUser(user).phone).toBeNull()
        user.phoneBinding = user.nameBinding
        expect(() => loadUser(user)).toThrow('Encrypted users.phone record binding is invalid.')
    })

    it('reads legacy profile values until strict cutover', () => {
        const user = storedUser('Legacy Name', '+79991111111')
        user.nameBinding = null
        user.phoneBinding = null
        expect(loadUser(user).name).toBe('Legacy Name')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING = 'true'
        try {
            expect(() => loadUser(user)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_USER_PROFILE_RECORD_BINDING = previous
        }
    })
})

describe('encrypted message body record binding', () => {
    function storedMessage(body: string | null) {
        const message = new ServiceMessageEntity()
        message.body = body
        message.requestId = null
        message.threadId = randomUUID()
        message.senderId = randomUUID()
        message.kind = ServiceMessageKind.Text
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_messages' }, entity: message } as InsertEvent<ServiceMessageEntity>)
        return message
    }

    function loadMessage(message: ServiceMessageEntity) {
        subscriber.afterLoad(message, { metadata: { tableName: 'autocare_service_messages' } } as LoadEvent<ServiceMessageEntity>)
        return message
    }

    it('binds a new body to its message ID and rejects a swapped body', () => {
        const source = storedMessage('Private source message')
        const target = storedMessage('Private target message')
        expect(source.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(source.bodyBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadMessage(source).body).toBe('Private source message')
        target.body = source.body
        expect(() => loadMessage(target)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rejects a changed thread, sender or kind even when the body and message ID are unchanged', () => {
        const message = storedMessage('Private message')
        const originalThreadId = message.threadId
        const originalSenderId = message.senderId
        message.threadId = randomUUID()
        expect(() => loadMessage(message)).toThrow('Encrypted record binding authentication failed.')
        message.threadId = originalThreadId
        message.senderId = randomUUID()
        expect(() => loadMessage(message)).toThrow('Encrypted record binding authentication failed.')
        message.senderId = originalSenderId
        message.kind = ServiceMessageKind.System
        expect(() => loadMessage(message)).toThrow('Encrypted record binding authentication failed.')
    })

    it('clears the binding when a message is deleted', () => {
        const message = storedMessage('Delete me')
        message.body = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_messages' }, entity: message } as UpdateEvent<ServiceMessageEntity>)
        expect(message.bodyBinding).toBeNull()
        expect(loadMessage(message).body).toBeNull()
        message.bodyBinding = 'p1_' + 'A'.repeat(43)
        expect(() => loadMessage(message)).toThrow('Encrypted autocare_service_messages.body record binding is invalid.')
    })

    it('keeps legacy message bodies readable until strict cutover', () => {
        const message = storedMessage('Legacy message')
        message.bodyBinding = null
        expect(loadMessage(message).body).toBe('Legacy message')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING = 'true'
        try {
            expect(() => loadMessage(message)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_BODY_RECORD_BINDING = previous
        }
    })
})
