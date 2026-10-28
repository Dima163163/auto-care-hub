import { randomUUID } from 'node:crypto'
import type { InsertEvent, LoadEvent, UpdateEvent } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { ClientVehicleEntity } from '../../../entities/user/client-vehicle.entity.js'
import { OutboxEventEntity } from '../../../entities/outbox/outbox-event.entity.js'
import { OAuthIdentityEntity, OAuthIdentityProvider } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { AutoCareChatThreadEntity, AutoCareChatThreadType, ServiceMessageEntity, ServiceMessageKind, ServiceRequestEntity } from '../../../entities/automotive/service-request.entity.js'
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

describe('encrypted user secondary record binding', () => {
    function storedUser() {
        const user = new UserEntity()
        user.email = `${randomUUID()}@example.test`
        user.name = 'Private Name'
        user.phone = null
        user.avatarUrl = '/avatar.png'
        user.communityDisplayName = 'Public Name'
        user.preferredCity = 'Самара'
        subscriber.beforeInsert({ metadata: { tableName: 'users' }, entity: user } as InsertEvent<UserEntity>)
        return user
    }

    function loadUser(user: UserEntity) {
        if (!isEmailBlindIndex(user.email)) user.email = createEmailBlindIndex(user.email)
        subscriber.afterLoad(user, { metadata: { tableName: 'users' } } as LoadEvent<UserEntity>)
        return user
    }

    it('binds three fields to user ID and rejects a copied value with its binding', () => {
        const source = storedUser()
        const target = storedUser()
        expect(source.avatarUrlBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(source.communityDisplayNameBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(source.preferredCityBinding).toMatch(/^p1_[A-Za-z0-9_-]{43}$/)
        expect(loadUser(source).preferredCity).toBe('Самара')
        const targetAvatarBinding = target.avatarUrlBinding
        target.avatarUrl = source.avatarUrl
        target.avatarUrlBinding = source.avatarUrlBinding
        expect(() => loadUser(target)).toThrow('Encrypted record binding authentication failed.')
        target.avatarUrl = '/avatar.png'
        target.avatarUrlBinding = targetAvatarBinding
        const targetCommunityBinding = target.communityDisplayNameBinding
        target.communityDisplayName = source.communityDisplayName
        target.communityDisplayNameBinding = source.communityDisplayNameBinding
        expect(() => loadUser(target)).toThrow('Encrypted record binding authentication failed.')
        target.communityDisplayNameBinding = targetCommunityBinding
        target.preferredCity = source.preferredCity
        target.preferredCityBinding = source.preferredCityBinding
        expect(() => loadUser(target)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds updates, accepts null and rejects a stale binding', () => {
        const user = storedUser()
        const previous = user.preferredCityBinding
        user.preferredCity = 'Казань'
        subscriber.beforeUpdate({ metadata: { tableName: 'users' }, entity: user } as UpdateEvent<UserEntity>)
        expect(user.preferredCityBinding).not.toBe(previous)
        expect(loadUser(user).preferredCity).toBe('Казань')
        user.preferredCity = null
        subscriber.beforeUpdate({ metadata: { tableName: 'users' }, entity: user } as UpdateEvent<UserEntity>)
        expect(user.preferredCityBinding).toBeNull()
        user.preferredCityBinding = previous
        expect(() => loadUser(user)).toThrow('Encrypted users.preferredCity record binding is invalid.')
    })

    it('keeps legacy values readable until strict cutover', () => {
        const user = storedUser()
        user.avatarUrlBinding = null
        expect(loadUser(user).avatarUrl).toBe('/avatar.png')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING = 'true'
        try {
            expect(() => loadUser(user)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_USER_SECONDARY_RECORD_BINDING = previous
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
        expect(source.kind).toBe(ServiceMessageKind.Text)
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

describe('encrypted message offer record binding', () => {
    function storedOffer(discountPercent = 10) {
        const message = new ServiceMessageEntity()
        message.body = 'Offer title'
        message.offer = {
            type: 'discount', title: 'Offer title', description: null, discountPercent,
            couponCode: null, amountMinor: null, currencyCode: null, expiresAt: null, status: 'pending',
        }
        message.requestId = null
        message.threadId = randomUUID()
        message.senderId = randomUUID()
        message.kind = ServiceMessageKind.Offer
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_messages' }, entity: message } as InsertEvent<ServiceMessageEntity>)
        return message
    }

    function loadOffer(message: ServiceMessageEntity) {
        subscriber.afterLoad(message, { metadata: { tableName: 'autocare_service_messages' } } as LoadEvent<ServiceMessageEntity>)
        return message
    }

    it('rejects swapping offers and changing their access scope', () => {
        const source = storedOffer()
        const target = storedOffer(15)
        expect(source.offerBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadOffer(source).offer?.status).toBe('pending')
        target.offer = source.offer
        target.offerBinding = source.offerBinding
        expect(() => loadOffer(target)).toThrow('Encrypted record binding authentication failed.')
        source.threadId = randomUUID()
        expect(() => loadOffer(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate status change and clears a deleted offer', () => {
        const message = storedOffer()
        const originalBinding = message.offerBinding
        message.offer = { ...message.offer!, status: 'accepted' }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_messages' }, entity: message } as UpdateEvent<ServiceMessageEntity>)
        expect(message.offerBinding).not.toBe(originalBinding)
        expect(loadOffer(message).offer?.status).toBe('accepted')
        message.offer = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_messages' }, entity: message } as UpdateEvent<ServiceMessageEntity>)
        expect(message.offerBinding).toBeNull()
        loadOffer(message)
        message.offerBinding = originalBinding
        expect(() => loadOffer(message)).toThrow('Encrypted autocare_service_messages.offer record binding is invalid.')
    })

    it('keeps legacy offers readable until strict cutover', () => {
        const message = storedOffer()
        message.offerBinding = null
        expect(loadOffer(message).offer?.status).toBe('pending')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING = 'true'
        try {
            expect(() => loadOffer(message)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_MESSAGE_OFFER_RECORD_BINDING = previous
        }
    })
})

describe('encrypted chat subject record binding', () => {
    function storedThread(subject: string) {
        const thread = new AutoCareChatThreadEntity()
        thread.type = AutoCareChatThreadType.Support
        thread.requestId = null
        thread.providerId = null
        thread.clientId = randomUUID()
        thread.createdById = thread.clientId
        thread.subject = subject
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_chat_threads' }, entity: thread } as InsertEvent<AutoCareChatThreadEntity>)
        return thread
    }

    function loadThread(thread: AutoCareChatThreadEntity) {
        subscriber.afterLoad(thread, { metadata: { tableName: 'autocare_chat_threads' } } as LoadEvent<AutoCareChatThreadEntity>)
        return thread
    }

    it('rejects a swapped subject and binding pair or changed access links', () => {
        const source = storedThread('Private source')
        const target = storedThread('Private target')
        expect(source.subjectBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadThread(source).subject).toBe('Private source')
        target.subject = source.subject
        target.subjectBinding = source.subjectBinding
        expect(() => loadThread(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadThread(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds an anonymized subject after client and creator links are cleared', () => {
        const thread = storedThread('Private source')
        thread.subject = '[deleted]'
        thread.clientId = null
        thread.createdById = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_chat_threads' }, entity: thread } as UpdateEvent<AutoCareChatThreadEntity>)
        expect(loadThread(thread).subject).toBe('[deleted]')
    })

    it('keeps legacy threads readable until strict cutover', () => {
        const thread = storedThread('Legacy subject')
        thread.subjectBinding = null
        expect(loadThread(thread).subject).toBe('Legacy subject')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING = 'true'
        try {
            expect(() => loadThread(thread)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_CHAT_SUBJECT_RECORD_BINDING = previous
        }
    })
})

describe('encrypted booking snapshot record binding', () => {
    function storedRequest(amountMinor: number) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.bookingSnapshot = { amountMinor, currencyCode: 'RUB' }
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping snapshot and binding together or changing ownership', () => {
        const source = storedRequest(50_000)
        const target = storedRequest(90_000)
        expect(source.bookingSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).bookingSnapshot?.amountMinor).toBe(50_000)
        target.bookingSnapshot = source.bookingSnapshot
        target.bookingSnapshotBinding = source.bookingSnapshotBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate payment update and clears a deleted snapshot', () => {
        const request = storedRequest(50_000)
        const previous = request.bookingSnapshotBinding
        request.bookingSnapshot = { ...request.bookingSnapshot, payableAmountMinor: 45_000 }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.bookingSnapshotBinding).not.toBe(previous)
        expect(loadRequest(request).bookingSnapshot?.payableAmountMinor).toBe(45_000)
        request.bookingSnapshot = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.bookingSnapshotBinding).toBeNull()
        loadRequest(request)
        request.bookingSnapshotBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.bookingSnapshot record binding is invalid.')
    })

    it('keeps legacy snapshots readable until strict cutover', () => {
        const request = storedRequest(50_000)
        request.bookingSnapshotBinding = null
        expect(loadRequest(request).bookingSnapshot?.amountMinor).toBe(50_000)
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_BOOKING_SNAPSHOT_RECORD_BINDING = previous
        }
    })
})

describe('encrypted accepted quote record binding', () => {
    function storedRequest(amountMinor: number) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.acceptedQuoteSnapshot = { amountMinor, currencyCode: 'RUB' }
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping snapshot and binding together or changing ownership', () => {
        const source = storedRequest(50_000)
        const target = storedRequest(90_000)
        expect(source.acceptedQuoteSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).acceptedQuoteSnapshot?.amountMinor).toBe(50_000)
        target.acceptedQuoteSnapshot = source.acceptedQuoteSnapshot
        target.acceptedQuoteSnapshotBinding = source.acceptedQuoteSnapshotBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate payment update and clears a deleted snapshot', () => {
        const request = storedRequest(50_000)
        const previous = request.acceptedQuoteSnapshotBinding
        request.acceptedQuoteSnapshot = { ...request.acceptedQuoteSnapshot, payableAmountMinor: 45_000 }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.acceptedQuoteSnapshotBinding).not.toBe(previous)
        expect(loadRequest(request).acceptedQuoteSnapshot?.payableAmountMinor).toBe(45_000)
        request.acceptedQuoteSnapshot = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.acceptedQuoteSnapshotBinding).toBeNull()
        loadRequest(request)
        request.acceptedQuoteSnapshotBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.acceptedQuoteSnapshot record binding is invalid.')
    })

    it('keeps legacy snapshots readable until strict cutover', () => {
        const request = storedRequest(50_000)
        request.acceptedQuoteSnapshotBinding = null
        expect(loadRequest(request).acceptedQuoteSnapshot?.amountMinor).toBe(50_000)
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_ACCEPTED_QUOTE_RECORD_BINDING = previous
        }
    })
})

describe('encrypted estimate snapshot record binding', () => {
    function storedRequest(amountMinor: number) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.estimateSnapshot = { amountMinor, currencyCode: 'RUB' }
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping snapshot and binding together or changing ownership', () => {
        const source = storedRequest(50_000)
        const target = storedRequest(90_000)
        expect(source.estimateSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).estimateSnapshot?.amountMinor).toBe(50_000)
        target.estimateSnapshot = source.estimateSnapshot
        target.estimateSnapshotBinding = source.estimateSnapshotBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate payment update and clears a deleted snapshot', () => {
        const request = storedRequest(50_000)
        const previous = request.estimateSnapshotBinding
        request.estimateSnapshot = { ...request.estimateSnapshot, payableAmountMinor: 45_000 }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.estimateSnapshotBinding).not.toBe(previous)
        expect(loadRequest(request).estimateSnapshot?.payableAmountMinor).toBe(45_000)
        request.estimateSnapshot = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.estimateSnapshotBinding).toBeNull()
        loadRequest(request)
        request.estimateSnapshotBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.estimateSnapshot record binding is invalid.')
    })

    it('keeps legacy snapshots readable until strict cutover', () => {
        const request = storedRequest(50_000)
        request.estimateSnapshotBinding = null
        expect(loadRequest(request).estimateSnapshot?.amountMinor).toBe(50_000)
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_ESTIMATE_SNAPSHOT_RECORD_BINDING = previous
        }
    })
})

describe('encrypted contact snapshot record binding', () => {
    function storedRequest(amountMinor: number) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.contactSnapshot = { email: `client-${amountMinor}@example.test` }
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping snapshot and binding together or changing ownership', () => {
        const source = storedRequest(50_000)
        const target = storedRequest(90_000)
        expect(source.contactSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).contactSnapshot?.email).toBe('client-50000@example.test')
        target.contactSnapshot = source.contactSnapshot
        target.contactSnapshotBinding = source.contactSnapshotBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate contact update and clears a deleted snapshot', () => {
        const request = storedRequest(50_000)
        const previous = request.contactSnapshotBinding
        request.contactSnapshot = { ...request.contactSnapshot, phone: '+79990000000' }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.contactSnapshotBinding).not.toBe(previous)
        expect(loadRequest(request).contactSnapshot?.phone).toBe('+79990000000')
        request.contactSnapshot = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.contactSnapshotBinding).toBeNull()
        loadRequest(request)
        request.contactSnapshotBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.contactSnapshot record binding is invalid.')
    })

    it('keeps legacy snapshots readable until strict cutover', () => {
        const request = storedRequest(50_000)
        request.contactSnapshotBinding = null
        expect(loadRequest(request).contactSnapshot?.email).toBe('client-50000@example.test')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_CONTACT_SNAPSHOT_RECORD_BINDING = previous
        }
    })
})

describe('encrypted vehicle snapshot record binding', () => {
    function storedRequest(amountMinor: number) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.vehicleId = null
        request.vehicleSnapshot = { brand: `Vehicle-${amountMinor}` }
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping snapshot and binding together or changing ownership', () => {
        const source = storedRequest(50_000)
        const target = storedRequest(90_000)
        expect(source.vehicleSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).vehicleSnapshot?.brand).toBe('Vehicle-50000')
        target.vehicleSnapshot = source.vehicleSnapshot
        target.vehicleSnapshotBinding = source.vehicleSnapshotBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        const originalClientId = source.clientId
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = originalClientId
        source.vehicleId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
        delete (source as Partial<ServiceRequestEntity>).vehicleId
        expect(() => loadRequest(source)).toThrow('Encrypted service request vehicle scope is invalid.')
    })

    it('rebinds a legitimate vehicle update and clears a deleted snapshot', () => {
        const request = storedRequest(50_000)
        const previous = request.vehicleSnapshotBinding
        request.vehicleSnapshot = { ...request.vehicleSnapshot, model: 'Camry' }
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.vehicleSnapshotBinding).not.toBe(previous)
        expect(loadRequest(request).vehicleSnapshot?.model).toBe('Camry')
        request.vehicleSnapshot = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.vehicleSnapshotBinding).toBeNull()
        loadRequest(request)
        request.vehicleSnapshotBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.vehicleSnapshot record binding is invalid.')
    })

    it('keeps legacy snapshots readable until strict cutover', () => {
        const request = storedRequest(50_000)
        request.vehicleSnapshotBinding = null
        expect(loadRequest(request).vehicleSnapshot?.brand).toBe('Vehicle-50000')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_VEHICLE_SNAPSHOT_RECORD_BINDING = previous
        }
    })
})

describe('encrypted service request note record binding', () => {
    function storedRequest(note: string) {
        const request = new ServiceRequestEntity()
        request.clientId = randomUUID()
        request.providerId = randomUUID()
        request.locationId = randomUUID()
        request.definitionId = randomUUID()
        request.note = note
        subscriber.beforeInsert({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as InsertEvent<ServiceRequestEntity>)
        return request
    }

    function loadRequest(request: ServiceRequestEntity) {
        subscriber.afterLoad(request, { metadata: { tableName: 'autocare_service_requests' } } as LoadEvent<ServiceRequestEntity>)
        return request
    }

    it('rejects swapping note and binding together or changing ownership', () => {
        const source = storedRequest('Private symptom')
        const target = storedRequest('Different symptom')
        expect(source.noteBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(loadRequest(source).note).toBe('Private symptom')
        target.note = source.note
        target.noteBinding = source.noteBinding
        expect(() => loadRequest(target)).toThrow('Encrypted record binding authentication failed.')
        source.clientId = randomUUID()
        expect(() => loadRequest(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds a legitimate update and clears a deleted note', () => {
        const request = storedRequest('Private symptom')
        const previous = request.noteBinding
        request.note = 'Updated private symptom'
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.noteBinding).not.toBe(previous)
        expect(loadRequest(request).note).toBe('Updated private symptom')
        request.note = null
        subscriber.beforeUpdate({ metadata: { tableName: 'autocare_service_requests' }, entity: request } as UpdateEvent<ServiceRequestEntity>)
        expect(request.noteBinding).toBeNull()
        loadRequest(request)
        request.noteBinding = previous
        expect(() => loadRequest(request)).toThrow('Encrypted autocare_service_requests.note record binding is invalid.')
    })

    it('keeps legacy notes readable until strict cutover', () => {
        const request = storedRequest('Private symptom')
        request.noteBinding = null
        expect(loadRequest(request).note).toBe('Private symptom')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING = 'true'
        try {
            expect(() => loadRequest(request)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_SERVICE_REQUEST_NOTE_RECORD_BINDING = previous
        }
    })
})

describe('encrypted client vehicle record binding', () => {
    function storedVehicle(vin: string) {
        const vehicle = new ClientVehicleEntity()
        vehicle.userId = randomUUID()
        vehicle.vin = vin
        vehicle.licensePlate = 'А123ВС63'
        vehicle.internalNumber = null
        vehicle.imageUrl = '/vehicle.png'
        subscriber.beforeInsert({ metadata: { tableName: 'client_vehicles' }, entity: vehicle } as InsertEvent<ClientVehicleEntity>)
        return vehicle
    }

    function loadVehicle(vehicle: ClientVehicleEntity) {
        subscriber.afterLoad(vehicle, { metadata: { tableName: 'client_vehicles' } } as LoadEvent<ClientVehicleEntity>)
        return vehicle
    }

    it('binds all four fields to row and owner and rejects a copied value and binding', () => {
        const source = storedVehicle('JT123456789012345')
        const target = storedVehicle('JT987654321098765')
        expect(source.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(source.vinBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(source.licensePlateBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(source.internalNumberBinding).toBeNull()
        expect(source.imageUrlBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        target.vin = source.vin
        target.vinBinding = source.vinBinding
        expect(() => loadVehicle(target)).toThrow('Encrypted record binding authentication failed.')
        source.userId = randomUUID()
        expect(() => loadVehicle(source)).toThrow('Encrypted record binding authentication failed.')
    })

    it('rebinds updates and rejects a leftover binding on a null field', () => {
        const vehicle = storedVehicle('JT123456789012345')
        const previous = vehicle.licensePlateBinding
        vehicle.licensePlate = 'В456СА63'
        subscriber.beforeUpdate({ metadata: { tableName: 'client_vehicles' }, entity: vehicle } as UpdateEvent<ClientVehicleEntity>)
        expect(vehicle.licensePlateBinding).not.toBe(previous)
        expect(loadVehicle(vehicle).licensePlate).toBe('В456СА63')
        vehicle.licensePlate = null
        subscriber.beforeUpdate({ metadata: { tableName: 'client_vehicles' }, entity: vehicle } as UpdateEvent<ClientVehicleEntity>)
        expect(vehicle.licensePlateBinding).toBeNull()
        vehicle.licensePlateBinding = previous
        expect(() => loadVehicle(vehicle)).toThrow('Encrypted client_vehicles.licensePlate record binding is invalid.')
    })

    it('keeps legacy values readable until strict cutover', () => {
        const vehicle = storedVehicle('JT123456789012345')
        vehicle.vinBinding = null
        expect(loadVehicle(vehicle).vin).toBe('JT123456789012345')
        const previous = process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING
        process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING = 'true'
        try {
            expect(() => loadVehicle(vehicle)).toThrow('Encrypted record binding is missing.')
        } finally {
            if (previous === undefined) delete process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING
            else process.env.DATA_ENCRYPTION_REQUIRE_CLIENT_VEHICLE_RECORD_BINDING = previous
        }
    })
})
