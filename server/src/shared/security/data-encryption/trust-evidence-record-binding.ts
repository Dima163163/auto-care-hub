import { createBlindIndex } from './field-encryption.js'
import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireTrustEvidenceRecordBinding } from './record-binding-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const TRUST_EVIDENCE_FIELDS = [
    { value: 'reference', binding: 'referenceBinding' },
    { value: 'notes', binding: 'notesBinding' },
] as const
export type TrustEvidenceValue = typeof TRUST_EVIDENCE_FIELDS[number]['value']
export type TrustEvidenceBinding = typeof TRUST_EVIDENCE_FIELDS[number]['binding']
export type TrustEvidenceRecord = {
    id?: string
    providerId?: string
    kind?: string
    referenceIndex?: string | null
} & Partial<Record<TrustEvidenceValue | TrustEvidenceBinding, string | null>>

export function trustEvidenceContext(record: Pick<TrustEvidenceRecord, 'providerId' | 'kind'>) {
    if (!record.providerId || !UUID.test(record.providerId) || !record.kind || record.kind.length > 128) {
        throw new Error('Encrypted trust evidence owner scope is invalid.')
    }
    return JSON.stringify([record.providerId.toLowerCase(), record.kind])
}

export function verifyTrustEvidenceReferenceIndex(reference: string | null, referenceIndex: string | null | undefined, allowLegacyNull = false) {
    if (reference === null) {
        if (referenceIndex !== null && referenceIndex !== undefined && !allowLegacyNull) {
            throw new Error('Encrypted trust evidence reference index is invalid.')
        }
        return
    }
    if (referenceIndex !== createBlindIndex(reference, 'evidence-reference')) {
        throw new Error('Encrypted trust evidence reference index authentication failed.')
    }
}

export function sealTrustEvidenceFields(record: TrustEvidenceRecord) {
    if (!TRUST_EVIDENCE_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted trust evidence record ID is missing.')
    const context = trustEvidenceContext(record)
    if (record.reference !== undefined) record.referenceIndex = record.reference === null
        ? null : createBlindIndex(record.reference, 'evidence-reference')
    for (const { value, binding } of TRUST_EVIDENCE_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('autocare_trust_evidence', value, plaintext, record.id, context)
    }
}

export function openTrustEvidenceFields(record: TrustEvidenceRecord) {
    if (!TRUST_EVIDENCE_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string' || !UUID.test(record.id)) throw new Error('Encrypted trust evidence record ID is missing.')
    const context = trustEvidenceContext(record)
    const allowLegacy = !requireTrustEvidenceRecordBinding()
    if (record.reference !== undefined) {
        verifyTrustEvidenceReferenceIndex(record.reference, record.referenceIndex, allowLegacy)
    }
    for (const { value, binding } of TRUST_EVIDENCE_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted autocare_trust_evidence.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('autocare_trust_evidence', value, plaintext, record.id,
            record[binding], { allowLegacy, context })
    }
}
