import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { openBroadcastOfferSnapshot, sealBroadcastOfferSnapshot, type BroadcastOfferRecord } from './broadcast-offer-record-binding.js'

const id = '00000000-0000-4000-8000-000000000001'
const broadcastRequestId = '00000000-0000-4000-8000-000000000002'
const providerId = '00000000-0000-4000-8000-000000000003'
const locationId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'broadcast-offer-binding-test',
    getIndexKey: () => Buffer.alloc(32, 79),
    getKey: () => ({ kek: Buffer.alloc(32, 80) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function record(): BroadcastOfferRecord {
    return { id, broadcastRequestId, providerId, locationId,
        offerSnapshot: { amountMinor: 10000, note: 'Private note' }, offerSnapshotBinding: null }
}

describe('broadcast offer record binding', () => {
    it('rejects swapped or modified offers and changed provider scope', () => {
        const offer = record()
        sealBroadcastOfferSnapshot(offer)
        expect(() => openBroadcastOfferSnapshot(offer)).not.toThrow()
        expect(() => openBroadcastOfferSnapshot({ ...offer, id: broadcastRequestId })).toThrow('authentication failed')
        expect(() => openBroadcastOfferSnapshot({ ...offer, broadcastRequestId: id })).toThrow('authentication failed')
        expect(() => openBroadcastOfferSnapshot({ ...offer, providerId: id })).toThrow('authentication failed')
        expect(() => openBroadcastOfferSnapshot({ ...offer, locationId: id })).toThrow('authentication failed')
        expect(() => openBroadcastOfferSnapshot({ ...offer, offerSnapshot: { amountMinor: 1 } })).toThrow('authentication failed')
    })
})
