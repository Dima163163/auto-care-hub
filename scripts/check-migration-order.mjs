import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function validateMigrationFile(fileName, source) {
    const match = /^(\d+)-([A-Za-z0-9]+)\.ts$/.exec(fileName)

    if (!match) {
        throw new Error(`Migration filename must be <timestamp>-<PascalCase>.ts: ${fileName}`)
    }

    const timestamp = Number(match[1])
    if (!Number.isSafeInteger(timestamp) || timestamp < 1_000_000_000_000) {
        throw new Error(`Migration timestamp is invalid: ${fileName}`)
    }
    const className = `${match[2]}${timestamp}`

    if (!new RegExp(`\\bexport\\s+class\\s+${className}\\b`).test(source)) {
        throw new Error(`Migration class must be export class ${className}: ${fileName}`)
    }

    const migrationName = /\bname\s*=\s*['"]([^'"]+)['"]/.exec(source)?.[1]
    if (migrationName !== undefined && migrationName !== className) {
        throw new Error(`Migration name must be ${className}: ${fileName}`)
    }

    return { fileName, timestamp, className }
}

export function validateMigrationOrder(migrations) {
    const seenTimestamps = new Map()
    for (const migration of migrations) {
        const previous = seenTimestamps.get(migration.timestamp)
        if (previous) {
            throw new Error(
                `Migration timestamp ${migration.timestamp} is duplicated by ${previous} and ${migration.fileName}`,
            )
        }
        seenTimestamps.set(migration.timestamp, migration.fileName)
    }

    const ordered = [...migrations].sort((left, right) => left.timestamp - right.timestamp)
    for (let index = 1; index < ordered.length; index += 1) {
        if (ordered[index - 1].timestamp >= ordered[index].timestamp) {
            throw new Error(`Migration timestamps are not strictly increasing near ${ordered[index].fileName}`)
        }
    }

    return ordered
}

async function main() {
    const migrationDirectory = process.argv[2] ?? 'server/src/database/migrations'
    const entries = await readdir(migrationDirectory, { withFileTypes: true })
    const migrationFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
        .map((entry) => entry.name)

    if (migrationFiles.length === 0) {
        throw new Error(`No TypeScript migrations found in ${migrationDirectory}`)
    }

    const migrations = await Promise.all(migrationFiles.map(async (fileName) => {
        const source = await readFile(resolve(migrationDirectory, fileName), 'utf8')
        return validateMigrationFile(fileName, source)
    }))
    const ordered = validateMigrationOrder(migrations)

    console.log(
        `Migration filename check passed for ${ordered.length} files; latest ${ordered.at(-1).fileName}.`,
    )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
