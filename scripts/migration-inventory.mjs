import { createHash } from 'node:crypto'

export function getMigrationInventoryChecksum(migrations) {
    if (!Array.isArray(migrations)) {
        throw new Error('Migration inventory must be an array.')
    }

    const normalized = migrations
        .map((migration) => {
            if (!migration || typeof migration.fileName !== 'string' || typeof migration.source !== 'string') {
                throw new Error('Migration inventory entries must include fileName and source.')
            }
            return `${migration.fileName}\0${migration.source}`
        })
        .sort()
        .join('\0')

    return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
