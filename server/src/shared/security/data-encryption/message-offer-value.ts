import type { ServiceMessageOffer } from '../../../entities/automotive/service-request.entity.js'

/** The same JSON representation is used before encryption and after decryption. */
export function serializeMessageOffer(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Encrypted autocare_service_messages.offer is invalid.')
    }
    const serialized = JSON.stringify(value)
    if (typeof serialized !== 'string') throw new Error('Encrypted autocare_service_messages.offer is invalid.')
    return serialized
}

export type MessageOfferRecord = { offer?: ServiceMessageOffer | null; offerBinding?: string | null }
