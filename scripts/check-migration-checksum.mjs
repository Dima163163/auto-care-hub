import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildMigrationInventory } from './check-migration-inventory.mjs'
import { evaluatePublishedMigrationImmutability } from './migration-inventory.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

export async function loadPublishedMigrationManifest(manifestPath) {
    const value = JSON.parse(await readFile(resolve(manifestPath), 'utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Migration checksum manifest root must be an object.')
    if (value.schemaVersion !== 1) throw new Error('Migration checksum manifest schemaVersion must be 1.')
    if (!Array.isArray(value.migrations) || value.migrations.length === 0) throw new Error('Migration checksum manifest must list published migrations.')
    if (typeof value.inventoryChecksum !== 'string' || !/^[a-f0-9]{64}$/.test(value.inventoryChecksum)) throw new Error('Migration checksum manifest must include a SHA-256 inventoryChecksum.')
    if (value.migrations.some((migration) => !migration || typeof migration.fileName !== 'string' || !/^[0-9]+-[A-Za-z0-9]+\.ts$/.test(migration.fileName))) throw new Error('Migration checksum manifest entries must include valid migration fileName values.')
    if (new Set(value.migrations.map((migration) => migration.fileName)).size !== value.migrations.length) throw new Error('Migration checksum manifest cannot contain duplicate fileName values.')
    if (value.migrations.some((migration) => !/^[a-f0-9]{64}$/.test(String(migration.sha256 ?? migration.sourceSha256 ?? '')))) throw new Error('Migration checksum manifest entries must include SHA-256 source hashes.')
    return value
}

export async function evaluateMigrationChecksumManifest({ migrationDirectory, manifestPath }) {
    const manifest = await loadPublishedMigrationManifest(manifestPath)
    const current = (await buildMigrationInventory(migrationDirectory)).migrations
    const result = evaluatePublishedMigrationImmutability({
        currentMigrations: current,
        publishedMigrations: manifest.migrations,
    })
    // The manifest is the last applied release baseline. A candidate may add
    // forward migrations, so its full inventory checksum is expected to differ;
    // immutable per-file hashes below remain the authoritative comparison.
    const currentInventory = await buildMigrationInventory(migrationDirectory)
    const manifestChecksumValid = typeof manifest.inventoryChecksum === 'string'
    return {
        manifest,
        currentInventory,
        ...result,
        manifestChecksumValid,
        pass: result.pass && manifestChecksumValid,
    }
}

function formatResult(result) {
    const lines = [
        `Migration checksum manifest (${result.currentInventory.count} current files)`,
        result.pass
            ? `[PASS] Published migration sources match the supplied checksum manifest; ${result.additions.length} candidate addition(s).`
            : '[BLOCKED] Published migration checksum or inventory mismatch detected.',
    ]
    if (result.mismatches.length > 0) lines.push(`Mismatches: ${result.mismatches.map((item) => `${item.fileName} expected=${item.expected} actual=${item.actual}`).join('; ')}`)
    if (result.missing.length > 0) lines.push(`Missing published files: ${result.missing.join(', ')}`)
    if (result.additions.length > 0) lines.push(`Unpublished additions: ${result.additions.join(', ')}`)
    return lines.join('\n')
}

async function main() {
    const manifestPath = process.env.PUBLISHED_MIGRATION_MANIFEST
    if (!manifestPath) {
        console.error('PUBLISHED_MIGRATION_MANIFEST is required; release migration cannot proceed without an applied inventory baseline.')
        process.exitCode = 1
        return
    }
    try {
        const result = await evaluateMigrationChecksumManifest({
            migrationDirectory: resolve(projectRoot, 'server/src/database/migrations'),
            manifestPath,
        })
        console.log(formatResult(result))
        if (!result.pass) process.exitCode = 1
    } catch (error) {
        console.error(`[migration-checksum] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
