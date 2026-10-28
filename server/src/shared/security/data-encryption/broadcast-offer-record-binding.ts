import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireBroadcastOfferRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLE = 'autocare_broadcast_offers'

export type BroadcastOfferRecord = {
    id?: string
    broadcastRequestId?: string
    providerId?: string
    locationId?: string
    offerSnapshot?: unknown
    offerSnapshotBinding?: string | null
}

export function broadcastOfferContext(record: BroadcastOfferRecord) {
    if (!record.broadcastRequestId || !UUID.test(record.broadcastRequestId)
        || !record.providerId || !UUID.test(record.providerId)
        || !record.locationId || !UUID.test(record.locationId)) {
        throw new Error('Encrypted broadcast offer scope is invalid.')
    }
    return JSON.stringify([record.broadcastRequestId.toLowerCase(), record.providerId.toLowerCase(), record.locationId.toLowerCase()])
}

export function serializeBroadcastOfferSnapshot(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Encrypted broadcast offer snapshot is invalid.')
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') throw new Error('Encrypted broadcast offer snapshot is invalid.')
    return serialized
}

export function sealBroadcastOfferSnapshot(record: BroadcastOfferRecord) {
    if (record.offerSnapshot === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted broadcast offer record ID is missing.')
    record.offerSnapshotBinding = createPlaintextRecordBinding(TABLE, 'offerSnapshot',
        serializeBroadcastOfferSnapshot(record.offerSnapshot), record.id, broadcastOfferContext(record))
}

export function openBroadcastOfferSnapshot(record: BroadcastOfferRecord) {
    if (record.offerSnapshot === undefined) return
    if (!record.id || !UUID.test(record.id)) throw new Error('Encrypted broadcast offer record ID is missing.')
    verifyPlaintextRecordBinding(TABLE, 'offerSnapshot', serializeBroadcastOfferSnapshot(record.offerSnapshot),
        record.id, record.offerSnapshotBinding,
        { allowLegacy: !requireBroadcastOfferRecordBinding(), context: broadcastOfferContext(record) })
}
