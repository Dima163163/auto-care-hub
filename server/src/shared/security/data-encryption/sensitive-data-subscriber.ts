import {
    EventSubscriber,
    type EntitySubscriberInterface,
    type InsertEvent,
    type LoadEvent,
    type UpdateEvent,
} from 'typeorm'
import { randomUUID } from 'node:crypto'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { OAuthIdentityEntity } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { OutboxEventEntity } from '../../../entities/outbox/outbox-event.entity.js'
import { AutoCareChatThreadEntity, ServiceMessageEntity, ServiceMessageKind, ServiceRequestEntity } from '../../../entities/automotive/service-request.entity.js'
import { createBlindIndex, decryptRecordBoundFieldValue, encryptRecordBoundFieldValue, getOutboxPayloadRecordId, isEmailBlindIndex, setOutboxPayloadRecordId, verifyEmailBlindIndex, type EncryptedRecordScope } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { messageRecordContext, type MessageRecordScope } from './message-record-scope.js'
import { serializeMessageOffer, type MessageOfferRecord } from './message-offer-value.js'
import { chatThreadRecordContext, type ChatThreadRecordScope } from './chat-thread-record-scope.js'
import { serviceRequestRecordContext, type ServiceRequestRecordScope } from './service-request-record-scope.js'
import { serializeBookingSnapshot } from './booking-snapshot-value.js'
import { serializeAcceptedQuote } from './accepted-quote-value.js'
import { requireAcceptedQuoteRecordBinding, requireBookingSnapshotRecordBinding, requireChatSubjectRecordBinding, requireEmailRecordBinding, requireMessageBodyRecordBinding, requireMessageOfferRecordBinding, requireOAuthRecordBinding, requireUserProfileRecordBinding } from './record-binding-policy.js'

type EmailRecord = {
    id?: string
    providerId?: string
    email?: string | null
    emailCiphertext?: string | null
}

function emailScope(record: EmailRecord, table: string): EncryptedRecordScope {
    if (typeof record.id !== 'string') throw new Error(`Encrypted ${table}.email record ID is missing.`)
    if (table === 'autocare_provider_invitations') {
        if (typeof record.providerId !== 'string') throw new Error('Encrypted invitation owner ID is missing.')
        return { rowId: record.id, ownerId: record.providerId }
    }
    return { rowId: record.id }
}

type ProviderIdentityRecord = {
    id?: string
    userId?: string
    provider?: string
    providerSubject?: string
    providerSubjectCiphertext?: string
}

type UserProfileRecord = {
    id?: string
    name?: string
    nameBinding?: string | null
    phone?: string | null
    phoneBinding?: string | null
}

type MessageRecord = MessageRecordScope & MessageOfferRecord & {
    id?: string
    body?: string | null
    bodyBinding?: string | null
}

type ChatThreadRecord = ChatThreadRecordScope & { id?: string; subject?: string; subjectBinding?: string | null }

type BookingSnapshotRecord = ServiceRequestRecordScope & {
    id?: string
    bookingSnapshot?: Record<string, unknown> | null
    bookingSnapshotBinding?: string | null
}

type AcceptedQuoteRecord = ServiceRequestRecordScope & {
    id?: string
    acceptedQuoteSnapshot?: Record<string, unknown> | null
    acceptedQuoteSnapshotBinding?: string | null
}

function sealAcceptedQuote(record: AcceptedQuoteRecord) {
    if (record.acceptedQuoteSnapshot === undefined) return
    if (record.acceptedQuoteSnapshot === null) {
        record.acceptedQuoteSnapshotBinding = null
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_requests.acceptedQuoteSnapshot record scope is invalid.')
    record.acceptedQuoteSnapshotBinding = createPlaintextRecordBinding(
        'autocare_service_requests', 'acceptedQuoteSnapshot', serializeAcceptedQuote(record.acceptedQuoteSnapshot), record.id,
        serviceRequestRecordContext(record),
    )
}

function openAcceptedQuote(record: AcceptedQuoteRecord) {
    if (record.acceptedQuoteSnapshot === undefined) return
    if (record.acceptedQuoteSnapshot === null) {
        if (record.acceptedQuoteSnapshotBinding !== null && record.acceptedQuoteSnapshotBinding !== undefined) {
            throw new Error('Encrypted autocare_service_requests.acceptedQuoteSnapshot record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_requests.acceptedQuoteSnapshot record scope is invalid.')
    verifyPlaintextRecordBinding(
        'autocare_service_requests', 'acceptedQuoteSnapshot', serializeAcceptedQuote(record.acceptedQuoteSnapshot), record.id,
        record.acceptedQuoteSnapshotBinding, { allowLegacy: !requireAcceptedQuoteRecordBinding(), context: serviceRequestRecordContext(record) },
    )
}

function sealBookingSnapshot(record: BookingSnapshotRecord) {
    if (record.bookingSnapshot === undefined) return
    if (record.bookingSnapshot === null) {
        record.bookingSnapshotBinding = null
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_requests.bookingSnapshot record scope is invalid.')
    record.bookingSnapshotBinding = createPlaintextRecordBinding(
        'autocare_service_requests', 'bookingSnapshot', serializeBookingSnapshot(record.bookingSnapshot), record.id,
        serviceRequestRecordContext(record),
    )
}

function openBookingSnapshot(record: BookingSnapshotRecord) {
    if (record.bookingSnapshot === undefined) return
    if (record.bookingSnapshot === null) {
        if (record.bookingSnapshotBinding !== null && record.bookingSnapshotBinding !== undefined) {
            throw new Error('Encrypted autocare_service_requests.bookingSnapshot record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_requests.bookingSnapshot record scope is invalid.')
    verifyPlaintextRecordBinding(
        'autocare_service_requests', 'bookingSnapshot', serializeBookingSnapshot(record.bookingSnapshot), record.id,
        record.bookingSnapshotBinding, { allowLegacy: !requireBookingSnapshotRecordBinding(), context: serviceRequestRecordContext(record) },
    )
}

function sealChatSubject(record: ChatThreadRecord) {
    if (record.subject === undefined) return
    if (typeof record.id !== 'string' || typeof record.subject !== 'string') {
        throw new Error('Encrypted autocare_chat_threads.subject record scope is invalid.')
    }
    record.subjectBinding = createPlaintextRecordBinding('autocare_chat_threads', 'subject', record.subject, record.id, chatThreadRecordContext(record))
}

function openChatSubject(record: ChatThreadRecord) {
    if (record.subject === undefined) return
    if (typeof record.id !== 'string' || typeof record.subject !== 'string') {
        throw new Error('Encrypted autocare_chat_threads.subject record scope is invalid.')
    }
    verifyPlaintextRecordBinding('autocare_chat_threads', 'subject', record.subject, record.id, record.subjectBinding, {
        allowLegacy: !requireChatSubjectRecordBinding(),
        context: chatThreadRecordContext(record),
    })
}

function sealMessageBody(record: MessageRecord) {
    if (record.body === undefined) return
    if (record.body === null) {
        record.bodyBinding = null
        return
    }
    if (typeof record.body !== 'string' || typeof record.id !== 'string') {
        throw new Error('Encrypted autocare_service_messages.body record scope is invalid.')
    }
    record.bodyBinding = createPlaintextRecordBinding('autocare_service_messages', 'body', record.body, record.id, messageRecordContext(record))
}

function openMessageBody(record: MessageRecord) {
    if (record.body === undefined) return
    if (record.body === null) {
        if (record.bodyBinding !== null && record.bodyBinding !== undefined) {
            throw new Error('Encrypted autocare_service_messages.body record binding is invalid.')
        }
        return
    }
    if (typeof record.body !== 'string' || typeof record.id !== 'string') {
        throw new Error('Encrypted autocare_service_messages.body record scope is invalid.')
    }
    verifyPlaintextRecordBinding('autocare_service_messages', 'body', record.body, record.id, record.bodyBinding, {
        allowLegacy: !requireMessageBodyRecordBinding(),
        context: messageRecordContext(record),
    })
}

function sealMessageOffer(record: MessageRecord) {
    if (record.offer === undefined) return
    if (record.offer === null) {
        record.offerBinding = null
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_messages.offer record scope is invalid.')
    record.offerBinding = createPlaintextRecordBinding('autocare_service_messages', 'offer', serializeMessageOffer(record.offer), record.id, messageRecordContext(record))
}

function openMessageOffer(record: MessageRecord) {
    if (record.offer === undefined) return
    if (record.offer === null) {
        if (record.offerBinding !== null && record.offerBinding !== undefined) {
            throw new Error('Encrypted autocare_service_messages.offer record binding is invalid.')
        }
        return
    }
    if (typeof record.id !== 'string') throw new Error('Encrypted autocare_service_messages.offer record scope is invalid.')
    verifyPlaintextRecordBinding('autocare_service_messages', 'offer', serializeMessageOffer(record.offer), record.id, record.offerBinding, {
        allowLegacy: !requireMessageOfferRecordBinding(),
        context: messageRecordContext(record),
    })
}

function sealUserProfile(record: UserProfileRecord) {
    if (record.name !== undefined) {
        if (typeof record.name !== 'string' || typeof record.id !== 'string') {
            throw new Error('Encrypted users.name record scope is invalid.')
        }
        record.nameBinding = createPlaintextRecordBinding('users', 'name', record.name, record.id)
    }
    if (record.phone !== undefined) {
        if (record.phone === null) record.phoneBinding = null
        else {
            if (typeof record.phone !== 'string' || typeof record.id !== 'string') {
                throw new Error('Encrypted users.phone record scope is invalid.')
            }
            record.phoneBinding = createPlaintextRecordBinding('users', 'phone', record.phone, record.id)
        }
    }
}

function openUserProfile(record: UserProfileRecord) {
    const allowLegacy = !requireUserProfileRecordBinding()
    if (record.name !== undefined) {
        if (typeof record.name !== 'string' || typeof record.id !== 'string') {
            throw new Error('Encrypted users.name record scope is invalid.')
        }
        verifyPlaintextRecordBinding('users', 'name', record.name, record.id, record.nameBinding, { allowLegacy })
    }
    if (record.phone !== undefined) {
        if (record.phone === null) {
            if (record.phoneBinding !== null && record.phoneBinding !== undefined) {
                throw new Error('Encrypted users.phone record binding is invalid.')
            }
        } else {
            if (typeof record.phone !== 'string' || typeof record.id !== 'string') {
                throw new Error('Encrypted users.phone record scope is invalid.')
            }
            verifyPlaintextRecordBinding('users', 'phone', record.phone, record.id, record.phoneBinding, { allowLegacy })
        }
    }
}

function providerSubjectScope(record: ProviderIdentityRecord): EncryptedRecordScope {
    if (typeof record.id !== 'string') throw new Error('Encrypted OAuth subject record ID is missing.')
    if (typeof record.userId !== 'string') throw new Error('Encrypted OAuth subject owner ID is missing.')
    if (record.provider !== 'google' && record.provider !== 'yandex') {
        throw new Error('Encrypted OAuth subject provider is invalid.')
    }
    return { rowId: record.id, ownerId: record.userId, context: record.provider }
}

function sealEmail(record: EmailRecord, table: string) {
    if (typeof record.email !== 'string' || record.email.length === 0) return
    if (isEmailBlindIndex(record.email)) throw new Error(`Encrypted ${table}.email plaintext is missing.`)
    record.emailCiphertext = JSON.stringify(encryptRecordBoundFieldValue(table, 'email', record.email, emailScope(record, table)))
}

function openEmail(record: EmailRecord, table: string) {
    if (record.emailCiphertext === null || record.emailCiphertext === undefined) {
        throw new Error(`Encrypted ${table}.email is missing; data-encryption migration is required.`)
    }
    const blindIndex = record.email
    if (typeof blindIndex !== 'string' || !isEmailBlindIndex(blindIndex)) {
        throw new Error(`Encrypted ${table}.email index is invalid.`)
    }
    const plaintext = decryptRecordBoundFieldValue<string>(table, 'email', record.emailCiphertext, emailScope(record, table), {
        allowLegacy: !requireEmailRecordBinding(),
    })
    if (!verifyEmailBlindIndex(plaintext, blindIndex)) {
        throw new Error(`Encrypted ${table}.email index authentication failed.`)
    }
    record.email = plaintext
}

function sealProviderSubject(record: ProviderIdentityRecord) {
    if (typeof record.providerSubject !== 'string' || !record.provider) return
    if (isEmailBlindIndex(record.providerSubject)) throw new Error('Encrypted OAuth subject plaintext is missing.')
    record.providerSubjectCiphertext = JSON.stringify(encryptRecordBoundFieldValue(
        'oauth_identities', 'providerSubject', record.providerSubject, providerSubjectScope(record),
    ))
}

function openProviderSubject(record: ProviderIdentityRecord) {
    if (typeof record.providerSubject !== 'string' || !record.providerSubjectCiphertext) {
        throw new Error('Encrypted OAuth subject is missing; data-encryption migration is required.')
    }
    const blindIndex = record.providerSubject
    if (!isEmailBlindIndex(blindIndex)) throw new Error('Encrypted OAuth subject index is invalid.')
    const plaintext = decryptRecordBoundFieldValue<string>(
        'oauth_identities', 'providerSubject', record.providerSubjectCiphertext, providerSubjectScope(record),
        { allowLegacy: !requireOAuthRecordBinding() },
    )
    record.providerSubject = plaintext
    if (createBlindIndex(plaintext, 'oauth-provider-subject') !== blindIndex) {
        throw new Error('Encrypted OAuth subject index authentication failed.')
    }
}

@EventSubscriber()
export class SensitiveDataSubscriber implements EntitySubscriberInterface {
    beforeInsert(event: InsertEvent<UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity | OutboxEventEntity | ServiceMessageEntity | AutoCareChatThreadEntity | ServiceRequestEntity>) {
        if (event.metadata.tableName === 'users' || event.metadata.tableName === 'autocare_provider_invitations') {
            if (!event.entity.id) event.entity.id = randomUUID()
            sealEmail(event.entity as EmailRecord, event.metadata.tableName)
            if (event.metadata.tableName === 'users') sealUserProfile(event.entity as UserProfileRecord)
        } else if (event.metadata.tableName === 'oauth_identities') {
            if (!event.entity.id) event.entity.id = randomUUID()
            sealProviderSubject(event.entity as ProviderIdentityRecord)
        } else if (event.metadata.tableName === 'outbox_events') {
            const outbox = event.entity as OutboxEventEntity
            if (!outbox.id) outbox.id = randomUUID()
            setOutboxPayloadRecordId(outbox.payload, outbox.id)
        } else if (event.metadata.tableName === 'autocare_service_messages') {
            const message = event.entity as ServiceMessageEntity
            if (!message.id) message.id = randomUUID()
            if (message.kind === undefined) message.kind = ServiceMessageKind.Text
            sealMessageBody(message)
            sealMessageOffer(message)
        } else if (event.metadata.tableName === 'autocare_chat_threads') {
            const thread = event.entity as AutoCareChatThreadEntity
            if (!thread.id) thread.id = randomUUID()
            sealChatSubject(thread)
        } else if (event.metadata.tableName === 'autocare_service_requests') {
            const request = event.entity as ServiceRequestEntity
            if (!request.id) request.id = randomUUID()
            sealAcceptedQuote(request)
            sealBookingSnapshot(request)
        }
    }

    beforeUpdate(event: UpdateEvent<UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity | OutboxEventEntity | ServiceMessageEntity | AutoCareChatThreadEntity | ServiceRequestEntity>) {
        if (event.entity && (event.metadata.tableName === 'users' || event.metadata.tableName === 'autocare_provider_invitations')) {
            sealEmail(event.entity as EmailRecord, event.metadata.tableName)
            if (event.metadata.tableName === 'users') sealUserProfile(event.entity as UserProfileRecord)
        } else if (event.entity && event.metadata.tableName === 'oauth_identities') {
            sealProviderSubject(event.entity as ProviderIdentityRecord)
        } else if (event.entity && event.metadata.tableName === 'outbox_events') {
            const outbox = event.entity as OutboxEventEntity
            if (outbox.id && outbox.payload) setOutboxPayloadRecordId(outbox.payload, outbox.id)
        } else if (event.entity && event.metadata.tableName === 'autocare_service_messages') {
            sealMessageBody(event.entity as MessageRecord)
            sealMessageOffer(event.entity as MessageRecord)
        } else if (event.entity && event.metadata.tableName === 'autocare_chat_threads') {
            sealChatSubject(event.entity as ChatThreadRecord)
        } else if (event.entity && event.metadata.tableName === 'autocare_service_requests') {
            sealAcceptedQuote(event.entity as AcceptedQuoteRecord)
            sealBookingSnapshot(event.entity as BookingSnapshotRecord)
        }
    }

    afterLoad(entity: UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity | OutboxEventEntity | ServiceMessageEntity | AutoCareChatThreadEntity | ServiceRequestEntity, event?: LoadEvent<UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity | OutboxEventEntity | ServiceMessageEntity | AutoCareChatThreadEntity | ServiceRequestEntity>) {
        const record = entity as EmailRecord
        const table = event?.metadata.tableName
        if ((table === 'users' || table === 'autocare_provider_invitations')
            && (record.email !== undefined || record.emailCiphertext !== undefined)) openEmail(record, table)
        if (table === 'users') openUserProfile(entity as UserProfileRecord)
        if (table === 'oauth_identities') {
            const identity = entity as ProviderIdentityRecord
            if (identity.providerSubject !== undefined || identity.providerSubjectCiphertext !== undefined) openProviderSubject(identity)
        }
        if (table === 'outbox_events') {
            const outbox = entity as OutboxEventEntity
            if (outbox.payload) {
                const rowId = getOutboxPayloadRecordId(outbox.payload)
                if (rowId && rowId !== outbox.id?.toLowerCase()) {
                    throw new Error('Encrypted outbox record binding authentication failed.')
                }
            }
        }
        if (table === 'autocare_service_messages') {
            openMessageBody(entity as MessageRecord)
            openMessageOffer(entity as MessageRecord)
        }
        if (table === 'autocare_chat_threads') openChatSubject(entity as ChatThreadRecord)
        if (table === 'autocare_service_requests') {
            openAcceptedQuote(entity as AcceptedQuoteRecord)
            openBookingSnapshot(entity as BookingSnapshotRecord)
        }
    }
}
