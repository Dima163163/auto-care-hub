import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runLegacyCleanupChecks } from './check-legacy-cleanup.mjs'
import { buildMigrationInventory } from './check-migration-inventory.mjs'
import { runSeoReleaseChecks } from './check-seo-release.mjs'
import { getGitProvenance, sha256File } from './release-provenance.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const migrationRelativePath = 'server/src/database/migrations'
const migrationBoundary = 1785700000000

function check(name, status, detail) {
    return { name, status, detail }
}

function migrationTimestamp(fileName) {
    const match = /^(\d+)-/.exec(String(fileName))
    return match ? Number(match[1]) : null
}

export function evaluateHistoricalMigrationImmutability({ fileNames, modifiedPaths = [], boundary = migrationBoundary }) {
    const historical = fileNames
        .map((fileName) => ({ fileName, timestamp: migrationTimestamp(fileName) }))
        .filter((migration) => migration.timestamp !== null && migration.timestamp < boundary)
    const historicalNames = new Set(historical.map(({ fileName }) => fileName))
    const modifiedHistorical = modifiedPaths
        .map((path) => String(path).replaceAll('\\', '/').split('/').at(-1))
        .filter((fileName) => historicalNames.has(fileName))

    return {
        historicalCount: historical.length,
        modifiedHistorical: [...new Set(modifiedHistorical)],
        result: modifiedHistorical.length === 0
            ? check('Historical migration immutability', 'pass', `${historical.length} migrations before boundary ${boundary} have no working-tree edits`)
            : check('Historical migration immutability', 'blocked', `historical migrations changed: ${[...new Set(modifiedHistorical)].join(', ')}`),
    }
}

function getWorkingTreeMigrationChanges(root) {
    const args = ['--name-only', '--', migrationRelativePath]
    const changed = new Set()
    for (const command of [['diff', ...args], ['ls-files', '--others', '--exclude-standard', '--', migrationRelativePath]]) {
        try {
            const output = execFileSync('git', command, { cwd: root, encoding: 'utf8' })
            for (const fileName of output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) changed.add(fileName)
        } catch {
            // A release summary can still report the inventory when git metadata
            // is unavailable (for example, in an exported source archive).
        }
    }
    return [...changed]
}

async function getMigrationAudit(root = projectRoot) {
    const directory = resolve(root, migrationRelativePath)
    const entries = await readdir(directory, { withFileTypes: true })
    const fileNames = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
        .map((entry) => entry.name)
    const inventory = await buildMigrationInventory(directory)
    const immutability = evaluateHistoricalMigrationImmutability({
        fileNames,
        modifiedPaths: getWorkingTreeMigrationChanges(root),
    })
    const historicalCount = fileNames.filter((fileName) => (migrationTimestamp(fileName) ?? Number.POSITIVE_INFINITY) < migrationBoundary).length

    return {
        inventory,
        historicalCount,
        replacementCount: inventory.count - historicalCount,
        immutability,
    }
}

export async function buildLocalReleaseSummary({ root = projectRoot } = {}) {
    const migration = await getMigrationAudit(root)
    const legacyChecks = await runLegacyCleanupChecks()
    const seoChecks = await runSeoReleaseChecks()
    const provenance = await getGitProvenance(root)
    const artifactPath = process.env.RELEASE_ARTIFACT_PATH
    const artifactSha256 = artifactPath
        ? await sha256File(artifactPath).catch(() => null)
        : null
    const replacementCoverage = legacyChecks.find((item) => item.name === 'Replacement coverage')
    const localChecks = [
        check('Migration inventory checksum', 'pass', `${migration.inventory.count} files; sha256 ${migration.inventory.checksum}`),
        migration.immutability.result,
        replacementCoverage ?? check('Replacement coverage', 'blocked', 'legacy cleanup did not return replacement coverage'),
        ...seoChecks.filter((item) => [
            'Open Graph image assets',
            'Canonical/robots consistency',
            'SEO runner URL safety',
            'Launch locale coverage',
            'Local HTML metadata report',
        ].includes(item.name)),
    ]

    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        environment: 'local',
        productionClaims: false,
        provenance: {
            commitSha: provenance.commitSha,
            clean: provenance.clean,
            dirtyManifestSha256: provenance.manifestSha256,
            staged: provenance.staged,
            unstaged: provenance.unstaged,
            untracked: provenance.untracked,
        },
        artifact: artifactPath
            ? { path: artifactPath, sha256: artifactSha256 }
            : { path: null, sha256: null },
        migration: {
            count: migration.inventory.count,
            checksum: migration.inventory.checksum,
            historicalCount: migration.historicalCount,
            replacementCount: migration.replacementCount,
            boundary: migrationBoundary,
        },
        checks: localChecks,
        externalGates: [
            'staging/production HTML and Lighthouse evidence',
            'encrypted backup vault and isolated restore rehearsal',
            'real pilot participants and written go/no-go',
        ],
        summary: {
            pass: localChecks.filter((item) => item.status === 'pass').length,
            blocked: localChecks.filter((item) => item.status === 'blocked').length,
            manual: localChecks.filter((item) => item.status === 'manual').length,
        },
    }
}

export function formatLocalReleaseSummary(summary) {
    const lines = [
        'AutoCare Hub local release summary',
        `Environment: ${summary.environment}; productionClaims=${summary.productionClaims}`,
        `Commit: ${summary.provenance?.commitSha ?? 'unavailable'}; clean=${summary.provenance?.clean ?? false}`,
        `Dirty manifest sha256: ${summary.provenance?.dirtyManifestSha256 ?? 'unavailable'}`,
        `Migration inventory: ${summary.migration.count} files; sha256 ${summary.migration.checksum}`,
    ]
    for (const item of summary.checks) lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
    lines.push(`Result: pass=${summary.summary.pass}, blocked=${summary.summary.blocked}, manual=${summary.summary.manual}`)
    lines.push('External gates are intentionally not represented as production evidence.')
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const summary = await buildLocalReleaseSummary()
    if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2))
    else console.log(formatLocalReleaseSummary(summary))
    if (summary.summary.blocked > 0 || (process.argv.includes('--strict') && summary.summary.manual > 0)) process.exitCode = 1
}
