import { createHash } from 'node:crypto'

export function getMigrationSourceSha256(source) {
    if (typeof source !== 'string') throw new Error('Migration source must be a string.')
    return createHash('sha256').update(source, 'utf8').digest('hex')
}

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

export function evaluatePublishedMigrationImmutability({ currentMigrations, publishedMigrations }) {
    if (!Array.isArray(currentMigrations) || !Array.isArray(publishedMigrations)) {
        throw new Error('Current and published migration inventories must be arrays.')
    }

    const currentByName = new Map(currentMigrations.map((migration) => [migration.fileName, migration]))
    const mismatches = []
    const missing = []
    for (const published of publishedMigrations) {
        const current = currentByName.get(published.fileName)
        if (!current) {
            missing.push(published.fileName)
            continue
        }
        const expected = String(published.sha256 ?? published.sourceSha256 ?? '')
        const actual = current.sha256 ?? getMigrationSourceSha256(current.source)
        if (!/^[a-f0-9]{64}$/.test(expected) || expected !== actual) {
            mismatches.push({ fileName: published.fileName, expected, actual })
        }
    }

    const publishedNames = new Set(publishedMigrations.map((migration) => migration.fileName))
    const additions = currentMigrations
        .filter((migration) => !publishedNames.has(migration.fileName))
        .map((migration) => migration.fileName)

    return {
        pass: mismatches.length === 0 && missing.length === 0,
        mismatches,
        missing,
        additions,
    }
}
