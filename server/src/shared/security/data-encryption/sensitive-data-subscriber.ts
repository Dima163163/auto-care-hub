import {
    EventSubscriber,
    type EntitySubscriberInterface,
    type InsertEvent,
    type LoadEvent,
    type UpdateEvent,
} from 'typeorm'
import { UserEntity } from '../../../entities/user/user.entity.js'
import { AutomotiveProviderInvitationEntity } from '../../../entities/automotive/provider-invitation.entity.js'
import { OAuthIdentityEntity } from '../../../entities/oauth-identity/oauth-identity.entity.js'
import { createBlindIndex, isEmailBlindIndex } from './field-encryption.js'
import { decryptFieldValue, encryptFieldValue } from './field-encryption.js'

type EmailRecord = {
    email?: string | null
    emailCiphertext?: string | null
}

type ProviderIdentityRecord = {
    provider?: string
    providerSubject?: string
    providerSubjectCiphertext?: string
}

function sealEmail(record: EmailRecord, table: string) {
    if (typeof record.email !== 'string' || record.email.length === 0) return
    record.emailCiphertext = JSON.stringify(encryptFieldValue(table, 'email', record.email))
}

function openEmail(record: EmailRecord, table: string) {
    if (record.emailCiphertext === null || record.emailCiphertext === undefined) {
        throw new Error(`Encrypted ${table}.email is missing; data-encryption migration is required.`)
    }
    record.email = decryptFieldValue<string>(table, 'email', record.emailCiphertext)
}

function sealProviderSubject(record: ProviderIdentityRecord) {
    if (typeof record.providerSubject !== 'string' || !record.provider) return
    record.providerSubjectCiphertext = JSON.stringify(encryptFieldValue('oauth_identities', 'providerSubject', record.providerSubject))
}

function openProviderSubject(record: ProviderIdentityRecord) {
    if (typeof record.providerSubject !== 'string' || !record.providerSubjectCiphertext) {
        throw new Error('Encrypted OAuth subject is missing; data-encryption migration is required.')
    }
    const blindIndex = record.providerSubject
    if (!isEmailBlindIndex(blindIndex)) throw new Error('Encrypted OAuth subject index is invalid.')
    const plaintext = decryptFieldValue<string>('oauth_identities', 'providerSubject', record.providerSubjectCiphertext)
    record.providerSubject = plaintext
    if (createBlindIndex(plaintext, 'oauth-provider-subject') !== blindIndex) {
        throw new Error('Encrypted OAuth subject index authentication failed.')
    }
}

@EventSubscriber()
export class SensitiveDataSubscriber implements EntitySubscriberInterface {
    beforeInsert(event: InsertEvent<UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity>) {
        if (event.metadata.tableName === 'users' || event.metadata.tableName === 'autocare_provider_invitations') {
            sealEmail(event.entity as EmailRecord, event.metadata.tableName)
        } else if (event.metadata.tableName === 'oauth_identities') {
            sealProviderSubject(event.entity as ProviderIdentityRecord)
        }
    }

    beforeUpdate(event: UpdateEvent<UserEntity | AutomotiveProviderInvitationEntity | OAuthIdentityEntity>) {
        if (event.entity && (event.metadata.tableName === 'users' || event.metadata.tableName === 'autocare_provider_invitations')) {
            sealEmail(event.entity as EmailRecord, event.metadata.tableName)
        } else if (event.entity && event.metadata.tableName === 'oauth_identities') {
            sealProviderSubject(event.entity as ProviderIdentityRecord)
        }
    }

    afterLoad(entity: UserEntity | AutomotiveProviderInvitationEntity, event?: LoadEvent<UserEntity | AutomotiveProviderInvitationEntity>) {
        const record = entity as EmailRecord
        const table = event?.metadata.tableName
        if ((table === 'users' || table === 'autocare_provider_invitations')
            && (record.email !== undefined || record.emailCiphertext !== undefined)) openEmail(record, table)
        if (table === 'oauth_identities') {
            const identity = entity as ProviderIdentityRecord
            if (identity.providerSubject !== undefined || identity.providerSubjectCiphertext !== undefined) openProviderSubject(identity)
        }
    }
}
