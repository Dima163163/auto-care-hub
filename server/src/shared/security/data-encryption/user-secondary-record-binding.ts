import { createPlaintextRecordBinding, verifyPlaintextRecordBinding } from './plaintext-record-binding.js'
import { requireUserSecondaryRecordBinding } from './record-binding-policy.js'

export const USER_SECONDARY_BOUND_FIELDS = [
    { value: 'avatarUrl', binding: 'avatarUrlBinding' },
    { value: 'communityDisplayName', binding: 'communityDisplayNameBinding' },
    { value: 'preferredCity', binding: 'preferredCityBinding' },
] as const

export type UserSecondaryValueColumn = typeof USER_SECONDARY_BOUND_FIELDS[number]['value']
export type UserSecondaryBindingColumn = typeof USER_SECONDARY_BOUND_FIELDS[number]['binding']
export type UserSecondaryBindingRecord = { id?: string }
    & Partial<Record<UserSecondaryValueColumn | UserSecondaryBindingColumn, string | null>>

export function sealUserSecondaryFields(record: UserSecondaryBindingRecord) {
    if (!USER_SECONDARY_BOUND_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted user record scope is invalid.')
    for (const { value, binding } of USER_SECONDARY_BOUND_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        record[binding] = plaintext === null ? null
            : createPlaintextRecordBinding('users', value, plaintext, record.id)
    }
}

export function openUserSecondaryFields(record: UserSecondaryBindingRecord) {
    if (!USER_SECONDARY_BOUND_FIELDS.some(({ value }) => record[value] !== undefined)) return
    if (typeof record.id !== 'string') throw new Error('Encrypted user record scope is invalid.')
    const allowLegacy = !requireUserSecondaryRecordBinding()
    for (const { value, binding } of USER_SECONDARY_BOUND_FIELDS) {
        const plaintext = record[value]
        if (plaintext === undefined) continue
        if (plaintext === null) {
            if (record[binding] !== null && record[binding] !== undefined) {
                throw new Error(`Encrypted users.${value} record binding is invalid.`)
            }
            continue
        }
        verifyPlaintextRecordBinding('users', value, plaintext, record.id, record[binding], { allowLegacy })
    }
}
