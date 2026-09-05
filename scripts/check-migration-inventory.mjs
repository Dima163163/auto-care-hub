import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getMigrationInventoryChecksum, getMigrationSourceSha256 } from './migration-inventory.mjs'

export async function buildMigrationInventory(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
        .map((entry) => entry.name)
        .sort()

    if (files.length === 0) {
        throw new Error(`No TypeScript migrations found in ${directory}`)
    }

    const migrations = await Promise.all(files.map(async (fileName) => ({
        fileName,
        source: await readFile(resolve(directory, fileName), 'utf8'),
    })))

    return {
        count: migrations.length,
        checksum: getMigrationInventoryChecksum(migrations),
        migrations: migrations.map((migration) => ({
            fileName: migration.fileName,
            sha256: getMigrationSourceSha256(migration.source),
        })),
    }
}

async function main() {
    const directory = process.argv[2] ?? 'server/src/database/migrations'
    const inventory = await buildMigrationInventory(directory)
    if (process.argv.includes('--json')) console.log(JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ...inventory,
    }, null, 2))
    else console.log(`Migration inventory: ${inventory.count} files; checksum ${inventory.checksum}.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
