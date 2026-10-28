import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireServiceQuoteSnapshotRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ServiceQuoteSnapshotRecord = {
    id?: string
    requestId?: string
    providerId?: string
    version?: number
    snapshot?: Record<string, unknown>
    snapshotBinding?: string | null
}

export function serviceQuoteSnapshotContext(record: Pick<ServiceQuoteSnapshotRecord, 'requestId' | 'providerId' | 'version'>) {
    if (!record.requestId || !UUID.test(record.requestId)
        || !record.providerId || !UUID.test(record.providerId)
        || !Number.isSafeInteger(record.version) || (record.version ?? 0) < 1) {
        throw new Error('Encrypted service quote snapshot scope is invalid.')
    }
    return JSON.stringify([record.requestId.toLowerCase(), record.providerId.toLowerCase(), record.version])
}

export function serializeServiceQuoteSnapshot(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Encrypted autocare_service_quotes.snapshot is invalid.')
    }
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') throw new Error('Encrypted autocare_service_quotes.snapshot is invalid.')
    return serialized
}

export function sealServiceQuoteSnapshot(record: ServiceQuoteSnapshotRecord) {
    if (record.snapshot === undefined) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted service quote snapshot record ID is missing.')
    record.snapshotBinding = createPlaintextRecordBinding('autocare_service_quotes', 'snapshot',
        serializeServiceQuoteSnapshot(record.snapshot), record.id, serviceQuoteSnapshotContext(record))
}

export function openServiceQuoteSnapshot(record: ServiceQuoteSnapshotRecord) {
    if (record.snapshot === undefined) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted service quote snapshot record ID is missing.')
    verifyPlaintextRecordBinding('autocare_service_quotes', 'snapshot',
        serializeServiceQuoteSnapshot(record.snapshot), record.id, record.snapshotBinding,
        { allowLegacy: !requireServiceQuoteSnapshotRecordBinding(), context: serviceQuoteSnapshotContext(record) })
}
