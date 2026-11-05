import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireProviderChangeRequestRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_provider_change_requests'

export type ProviderChangeRequestRecord = {
    id?: string
    providerId?: string
    requestedById?: string
    kind?: string
    payload?: Record<string, unknown>
    payloadBinding?: string | null
    reviewReason?: string | null
    reviewReasonBinding?: string | null
}

export function providerChangeRequestContext(record: ProviderChangeRequestRecord) {
    if (!record.providerId || !UUID.test(record.providerId)
        || !record.requestedById || !UUID.test(record.requestedById)
        || !record.kind || record.kind.length > 64) {
        throw new Error('Encrypted provider change request owner scope is invalid.')
    }
    return JSON.stringify([record.providerId.toLowerCase(), record.requestedById.toLowerCase(), record.kind])
}

export function serializeProviderChangeRequestPayload(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Encrypted provider change request payload is invalid.')
    }
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') throw new Error('Encrypted provider change request payload is invalid.')
    return serialized
}

export function sealProviderChangeRequestFields(record: ProviderChangeRequestRecord) {
    if (record.payload === undefined && record.reviewReason === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted provider change request record ID is missing.')
    const context = providerChangeRequestContext(record)
    if (record.payload !== undefined) {
        record.payloadBinding = createPlaintextRecordBinding(TABLE, 'payload',
            serializeProviderChangeRequestPayload(record.payload), record.id, context)
    }
    if (record.reviewReason !== undefined) {
        record.reviewReasonBinding = record.reviewReason === null ? null
            : createPlaintextRecordBinding(TABLE, 'reviewReason', record.reviewReason, record.id, context)
    }
}

export function openProviderChangeRequestFields(record: ProviderChangeRequestRecord) {
    if (record.payload === undefined && record.reviewReason === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted provider change request record ID is missing.')
    const context = providerChangeRequestContext(record)
    const allowLegacy = !requireProviderChangeRequestRecordBinding()
    if (record.payload !== undefined) {
        verifyPlaintextRecordBinding(TABLE, 'payload', serializeProviderChangeRequestPayload(record.payload),
            record.id, record.payloadBinding, { allowLegacy, context })
    }
    if (record.reviewReason !== undefined) {
        if (record.reviewReason === null) {
            if (record.reviewReasonBinding !== null && record.reviewReasonBinding !== undefined) {
                throw new Error('Encrypted provider change request review reason binding is invalid.')
            }
        } else {
            verifyPlaintextRecordBinding(TABLE, 'reviewReason', record.reviewReason,
                record.id, record.reviewReasonBinding, { allowLegacy, context })
        }
    }
}
