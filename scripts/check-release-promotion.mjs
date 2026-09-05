import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { evaluateMigrationChecksumManifest } from './check-migration-checksum.mjs'
import { getGitProvenance, sha256File } from './release-provenance.mjs'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const freezePath = resolve(projectRoot, 'docs/operations/PILOT_SCOPE_FREEZE.md')
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const GIT_SHA_PATTERN = /^[a-f0-9]{40}$/

export function extractRequiredGateIds(scopeSource) {
    return [...new Set([...String(scopeSource).matchAll(/\|\s*`(V2-[A-Z]+-\d+)`\s*\|/g)].map((match) => match[1]))]
}

function result(name, status, detail) {
    return { name, status, detail }
}

function isFresh(value, now, maxAgeDays) {
    const time = Date.parse(String(value ?? ''))
    if (!Number.isFinite(time)) return false
    const age = now.getTime() - time
    return age >= 0 && age <= maxAgeDays * 24 * 60 * 60 * 1_000
}

export function validateReleasePromotion(input, {
    now = new Date(),
    maxAgeDays = 30,
    expectedReleaseSha = null,
    currentProvenance = null,
    expectedArtifactSha256 = null,
    requiredGateIds = [],
} = {}) {
    const evidence = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
    const checks = []
    checks.push(evidence.schemaVersion === 1
        ? result('Evidence schema', 'pass', 'release evidence schemaVersion=1')
        : result('Evidence schema', 'blocked', 'release evidence schemaVersion must be 1'))
    checks.push(['staging', 'production'].includes(evidence.environment)
        ? result('Environment', 'pass', `promotion evidence targets ${evidence.environment}`)
        : result('Environment', 'blocked', 'environment must be staging or production'))

    const releaseShaValid = typeof evidence.releaseSha === 'string' && GIT_SHA_PATTERN.test(evidence.releaseSha)
    checks.push(releaseShaValid && (!expectedReleaseSha || evidence.releaseSha === expectedReleaseSha)
        ? result('Release SHA', 'pass', `releaseSha=${evidence.releaseSha}`)
        : result('Release SHA', 'blocked', `releaseSha must be a full immutable commit SHA${expectedReleaseSha ? ` matching ${expectedReleaseSha}` : ''}`))

    const artifactValid = typeof evidence.artifactSha256 === 'string' && SHA256_PATTERN.test(evidence.artifactSha256)
    checks.push(artifactValid && (!expectedArtifactSha256 || evidence.artifactSha256 === expectedArtifactSha256)
        ? result('Artifact hash', 'pass', `artifactSha256=${evidence.artifactSha256}`)
        : result('Artifact hash', 'blocked', 'a verified SHA-256 artifact hash is required and must match the measured artifact'))

    const sourceTree = evidence.sourceTree && typeof evidence.sourceTree === 'object' ? evidence.sourceTree : {}
    const cleanManifestValid = sourceTree.clean === true
        && typeof sourceTree.dirtyManifestSha256 === 'string'
        && SHA256_PATTERN.test(sourceTree.dirtyManifestSha256)
    const matchesCurrentTree = currentProvenance
        ? sourceTree.clean === currentProvenance.clean
            && sourceTree.dirtyManifestSha256 === currentProvenance.manifestSha256
        : true
    checks.push(cleanManifestValid && matchesCurrentTree
        ? result('Clean source provenance', 'pass', 'source tree is clean and the dirty manifest hash is bound to this run')
        : result('Clean source provenance', 'blocked', 'release evidence must bind to a clean source tree and its dirty manifest hash'))

    checks.push(typeof evidence.configFingerprint === 'string' && SHA256_PATTERN.test(evidence.configFingerprint)
        ? result('Configuration fingerprint', 'pass', 'configuration fingerprint is present without secret values')
        : result('Configuration fingerprint', 'blocked', 'a SHA-256 configuration fingerprint is required'))
    checks.push(isFresh(evidence.executedAt ?? evidence.generatedAt, now, maxAgeDays)
        ? result('Evidence freshness', 'pass', `evidence is no older than ${maxAgeDays} days`)
        : result('Evidence freshness', 'blocked', `executedAt/generatedAt must be a timestamp within ${maxAgeDays} days`))

    const signature = evidence.signature && typeof evidence.signature === 'object' ? evidence.signature : {}
    checks.push(typeof signature.algorithm === 'string'
        && typeof signature.signer === 'string'
        && typeof signature.value === 'string'
        && signature.value.length >= 16
        && typeof signature.verificationUri === 'string'
        && signature.verificationUri.trim().length > 0
        ? result('Evidence signature', 'pass', `signed by ${signature.signer} using ${signature.algorithm}`)
        : result('Evidence signature', 'blocked', 'release evidence requires a signature, algorithm, signer and verification reference'))

    checks.push(Array.isArray(evidence.dependencies) && evidence.dependencies.length > 0 && evidence.dependencies.every((item) => typeof item === 'string' && item.trim().length > 0)
        ? result('Evidence dependencies', 'pass', `${evidence.dependencies.length} dependency reference(s) recorded`)
        : result('Evidence dependencies', 'blocked', 'release evidence must list its gate/infrastructure dependencies'))

    const migration = evidence.migration && typeof evidence.migration === 'object' ? evidence.migration : {}
    checks.push(typeof migration.inventoryChecksum === 'string' && SHA256_PATTERN.test(migration.inventoryChecksum)
        && typeof migration.manifestSha256 === 'string' && SHA256_PATTERN.test(migration.manifestSha256)
        ? result('Migration provenance', 'pass', 'migration inventory and applied-manifest checksums are recorded')
        : result('Migration provenance', 'blocked', 'published migration inventory and checksum manifest hashes are required'))

    const gates = Array.isArray(evidence.gates) ? evidence.gates : []
    const gateMap = new Map(gates.map((gate) => [gate?.gateId, gate]))
    const duplicateGateIds = gates.length !== gateMap.size
    const missingGateIds = requiredGateIds.filter((gateId) => !gateMap.has(gateId))
    const failedGateIds = requiredGateIds.filter((gateId) => gateMap.get(gateId)?.status !== 'pass')
    const waivedRequired = requiredGateIds.filter((gateId) => gateMap.get(gateId)?.waived === true)
    const malformedGateIds = requiredGateIds.filter((gateId) => {
        const gate = gateMap.get(gateId)
        return !gate
            || typeof gate.command !== 'string'
            || gate.command.trim().length === 0
            || gate.exitCode !== 0
            || !isFresh(gate.executedAt, now, maxAgeDays)
            || typeof gate.evidenceUri !== 'string'
            || gate.evidenceUri.trim().length === 0
            || typeof gate.owner !== 'string'
            || gate.owner.trim().length === 0
            || typeof gate.reviewer !== 'string'
            || gate.reviewer.trim().length === 0
    })
    checks.push(!duplicateGateIds && missingGateIds.length === 0 && failedGateIds.length === 0 && waivedRequired.length === 0 && malformedGateIds.length === 0
        ? result('Mandatory gates', 'pass', `${requiredGateIds.length} mandatory V2 gates are explicitly passing`)
        : result('Mandatory gates', 'blocked', `missing=${missingGateIds.join(', ') || 'none'} failed=${failedGateIds.join(', ') || 'none'} waived=${waivedRequired.join(', ') || 'none'} malformed=${malformedGateIds.join(', ') || 'none'}`))

    return checks
}

function formatChecks(checks) {
    const lines = ['AutoCare Hub release promotion gate']
    for (const check of checks) lines.push(`[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`)
    const blocked = checks.filter((check) => check.status === 'blocked').length
    lines.push(`Result: ${blocked === 0 ? 'promotion evidence accepted' : `blocked by ${blocked} release gate(s)`}.`)
    return lines.join('\n')
}

async function main() {
    const evidencePath = process.env.RELEASE_EVIDENCE_FILE
    if (!evidencePath) {
        console.error('RELEASE_EVIDENCE_FILE is required; no release promotion evidence may be implied by local checks.')
        process.exitCode = 1
        return
    }

    let evidence
    try {
        evidence = JSON.parse(await readFile(resolve(evidencePath), 'utf8'))
    } catch (error) {
        console.error(`[release-promotion] cannot read ${evidencePath}: ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
        return
    }

    const provenance = await getGitProvenance(projectRoot)
    const artifactPath = process.env.RELEASE_ARTIFACT_PATH
    const expectedArtifactSha256 = artifactPath
        ? await sha256File(artifactPath).catch(() => '__unavailable__')
        : null
    const scopeSource = await readFile(freezePath, 'utf8')
    const checks = validateReleasePromotion(evidence, {
        expectedReleaseSha: process.env.RELEASE_SHA ?? provenance.commitSha,
        currentProvenance: provenance,
        expectedArtifactSha256,
        requiredGateIds: extractRequiredGateIds(scopeSource),
    })

    const manifestPath = process.env.PUBLISHED_MIGRATION_MANIFEST
    if (!manifestPath) {
        checks.push(result('Published migration manifest', 'blocked', 'PUBLISHED_MIGRATION_MANIFEST is required for promotion'))
    } else {
        try {
            const migration = await evaluateMigrationChecksumManifest({
                migrationDirectory: resolve(projectRoot, 'server/src/database/migrations'),
                manifestPath,
            })
            checks.push(migration.pass
                ? result('Published migration manifest', 'pass', 'published migration sources match the applied checksum baseline')
                : result('Published migration manifest', 'blocked', 'published migration sources differ from the applied checksum baseline'))
            checks.push(evidence.migration?.inventoryChecksum === migration.currentInventory.checksum
                ? result('Candidate migration inventory', 'pass', 'evidence is bound to the exact candidate migration inventory')
                : result('Candidate migration inventory', 'blocked', 'evidence migration inventory checksum does not match the checked-out candidate'))
            const manifestSha256 = await sha256File(manifestPath)
            checks.push(evidence.migration?.manifestSha256 === manifestSha256
                ? result('Applied manifest artifact', 'pass', 'evidence is bound to the exact downloaded applied-migration manifest')
                : result('Applied manifest artifact', 'blocked', 'evidence applied-migration manifest hash does not match the downloaded manifest'))
        } catch (error) {
            checks.push(result('Published migration manifest', 'blocked', error instanceof Error ? error.message : String(error)))
        }
    }

    console.log(formatChecks(checks))
    if (checks.some((check) => check.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
