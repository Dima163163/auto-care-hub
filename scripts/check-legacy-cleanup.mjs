import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateMigrationFile, validateMigrationOrder } from './check-migration-order.mjs'
import { buildMigrationInventory } from './check-migration-inventory.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(projectRoot, 'docs/architecture/legacy-cleanup-manifest.json')

function check(name, status, detail) {
    return { name, status, detail }
}

function projectPath(path) {
    return resolve(projectRoot, path)
}

function pathExists(path) {
    const candidate = projectPath(path)
    if (!existsSync(candidate)) return false

    // Git does not preserve empty directories. Treat a directory left behind by
    // a local file deletion as deleted, while still detecting real legacy
    // content that would survive a checkout.
    const hasTrackedContent = (entryPath) => {
        const stat = statSync(entryPath)
        if (!stat.isDirectory()) return true
        return readdirSync(entryPath).some((entry) => hasTrackedContent(resolve(entryPath, entry)))
    }

    return hasTrackedContent(candidate)
}

async function readManifest() {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
}

async function checkManifest(manifest) {
    const checks = []
    const families = Array.isArray(manifest.legacyFamilies) ? manifest.legacyFamilies : []
    if (manifest.schemaVersion !== 1 || manifest.policy !== 'replace_vertical_slices_then_delete') {
        checks.push(check('Legacy cleanup manifest', 'blocked', 'schemaVersion/policy is missing or unsupported'))
        return checks
    }

    const failures = []
    let coveredFamilies = 0
    for (const family of families) {
        if (!family || typeof family.id !== 'string' || !Array.isArray(family.paths)) {
            failures.push('invalid family entry')
            continue
        }

        const missingReplacements = (family.replacementPaths ?? []).filter((path) => !pathExists(path))
        const missingTests = (family.coverageTests ?? []).filter((path) => !pathExists(path))
        const missingConsumers = (family.runtimeConsumers ?? []).filter((path) => !pathExists(path))
        const existingLegacyPaths = family.paths.filter((path) => pathExists(path))

        if (family.status === 'deleted' && existingLegacyPaths.length > 0) {
            failures.push(`${family.id}: deleted paths still exist (${existingLegacyPaths.join(', ')})`)
        }
        if (family.status === 'retained_compatibility' && existingLegacyPaths.length !== family.paths.length) {
            failures.push(`${family.id}: retained compatibility path is missing`)
        }
        if (missingReplacements.length > 0) failures.push(`${family.id}: missing replacement ${missingReplacements.join(', ')}`)
        if (missingTests.length > 0) failures.push(`${family.id}: missing coverage test ${missingTests.join(', ')}`)
        if (missingConsumers.length > 0) failures.push(`${family.id}: missing runtime consumer ${missingConsumers.join(', ')}`)
        if (family.status === 'retained_compatibility' && missingReplacements.length === 0 && missingTests.length === 0) coveredFamilies += 1
    }

    checks.push(failures.length === 0
        ? check('Legacy cleanup manifest', 'pass', `${families.length} legacy families have explicit status, replacements and coverage gates`)
        : check('Legacy cleanup manifest', 'blocked', failures.join('; ')))
    checks.push(check(
        'Replacement coverage',
        coveredFamilies === families.filter((family) => family.status === 'retained_compatibility').length ? 'pass' : 'blocked',
        `${coveredFamilies}/${families.filter((family) => family.status === 'retained_compatibility').length} retained compatibility families have replacement paths and tests`,
    ))
    return checks
}

async function checkMigrations(manifest) {
    const migrationDirectory = projectPath(manifest.migrationPolicy?.path ?? 'server/src/database/migrations')
    const entries = await readdir(migrationDirectory, { withFileTypes: true })
    const migrationFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
        .map((entry) => entry.name)

    if (migrationFiles.length === 0) return [check('Migration audit', 'blocked', 'no TypeScript migrations found')]

    try {
        const migrations = await Promise.all(migrationFiles.map(async (fileName) => {
            const source = await readFile(resolve(migrationDirectory, fileName), 'utf8')
            return validateMigrationFile(fileName, source)
        }))
        const ordered = validateMigrationOrder(migrations)
        const boundary = Number(manifest.migrationPolicy?.legacyBefore ?? manifest.historicalMigrationBoundary)
        const legacy = ordered.filter((migration) => migration.timestamp < boundary)
        const replacement = ordered.filter((migration) => migration.timestamp >= boundary)
        const inventory = await buildMigrationInventory(migrationDirectory)

        return [
            check('Migration filename/order audit', 'pass', `${ordered.length} files validated; latest ${ordered.at(-1).fileName}`),
            check('Historical migration inventory', legacy.length > 0 ? 'pass' : 'blocked', `${legacy.length} pre-AutoCare migrations preserved with checksum ${inventory.checksum}`),
            check('AutoCare replacement migrations', replacement.length > 0 ? 'pass' : 'blocked', `${replacement.length} AutoCare migrations follow the legacy boundary ${boundary}`),
        ]
    } catch (error) {
        return [check('Migration filename/order audit', 'blocked', error instanceof Error ? error.message : 'migration validation failed')]
    }
}

function runStaticGuard(name, scriptName) {
    try {
        const output = execFileSync(process.execPath, [resolve(projectRoot, 'scripts', scriptName)], { encoding: 'utf8' }).trim()
        return check(name, 'pass', output.split('\n').at(-1) || 'guard passed')
    } catch (error) {
        const output = error?.stdout?.toString().trim() || error?.message || 'guard failed'
        return check(name, 'blocked', output.split('\n').at(-1) || 'guard failed')
    }
}

export async function runLegacyCleanupChecks() {
    const manifest = await readManifest()
    return [
        ...(await checkManifest(manifest)),
        ...(await checkMigrations(manifest)),
        runStaticGuard('Legacy runtime guard', 'check-no-bookly-runtime.mjs'),
        runStaticGuard('Legacy payment runtime guard', 'check-no-legacy-provider.mjs'),
        runStaticGuard('Legacy file classification', 'check-legacy-file-classification.mjs'),
    ]
}

function formatReport(checks) {
    const lines = ['AutoCare Hub legacy cleanup audit']
    for (const item of checks) lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
    const blocked = checks.filter((item) => item.status === 'blocked').length
    lines.push(blocked === 0 ? 'Result: compatibility audit passed; only explicitly gated legacy paths remain.' : `Result: blocked by ${blocked} legacy cleanup gate(s).`)
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const checks = await runLegacyCleanupChecks()
    if (process.argv.includes('--json')) console.log(JSON.stringify(checks, null, 2))
    else console.log(formatReport(checks))
    if (checks.some((item) => item.status === 'blocked')) process.exitCode = 1
}
