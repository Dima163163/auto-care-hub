import { createHmac, timingSafeEqual } from 'node:crypto'
import { getDataEncryptionKeyProvider } from './field-encryption.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Companion MAC for columns whose TypeORM transformer cannot see the row ID. */
export function createPlaintextRecordBinding(table: string, column: string, value: string, rowId: string, context?: string) {
    if (!UUID.test(rowId) || !table || !column || typeof value !== 'string') {
        throw new Error('Encrypted record scope is invalid.')
    }
    if (context !== undefined && (!context || typeof context !== 'string')) throw new Error('Encrypted record context is invalid.')
    const message = context === undefined
        ? JSON.stringify(['autocarehub:plaintext-record-binding:v1', table, column, rowId.toLowerCase(), value])
        : JSON.stringify(['autocarehub:plaintext-record-binding:v2', table, column, rowId.toLowerCase(), context, value])
    const digest = createHmac('sha256', getDataEncryptionKeyProvider().getIndexKey()).update(message, 'utf8').digest('base64url')
    return `${context === undefined ? 'p1' : 'p2'}_${digest}`
}

export function verifyPlaintextRecordBinding(
    table: string, column: string, value: string, rowId: string, binding: string | null | undefined,
    options: { allowLegacy?: boolean; context?: string } = {},
) {
    if (binding === null || binding === undefined) {
        if (options.allowLegacy) return
        throw new Error('Encrypted record binding is missing.')
    }
    const format = options.context === undefined ? /^p1_[A-Za-z0-9_-]{43}$/ : /^p2_[A-Za-z0-9_-]{43}$/
    if (!format.test(binding)) throw new Error('Encrypted record binding is invalid.')
    const expected = Buffer.from(createPlaintextRecordBinding(table, column, value, rowId, options.context), 'utf8')
    const actual = Buffer.from(binding, 'utf8')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        throw new Error('Encrypted record binding authentication failed.')
    }
}
