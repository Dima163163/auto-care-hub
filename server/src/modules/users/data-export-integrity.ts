import { createHash } from 'node:crypto'

export function getDataExportIntegrityChecksum(value: unknown) {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) throw new Error('Data export must be JSON serializable.')
    return createHash('sha256').update(serialized, 'utf8').digest('hex')
}
