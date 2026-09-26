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

function matchesTrustedRun(evidenceRun, trustedRun, { workflowPath, workflowRef, event, headBranch, headSha, releaseSha = null }) {
    return evidenceRun && trustedRun
        && String(evidenceRun.runId) === String(trustedRun.runId)
        && trustedRun.repository === process.env.GITHUB_REPOSITORY
        && evidenceRun.repository === trustedRun.repository
        && evidenceRun.workflowPath === workflowPath
        && trustedRun.workflowPath === workflowPath
        && evidenceRun.workflowRef === workflowRef
        && trustedRun.workflowRef === workflowRef
        && evidenceRun.event === event
        && trustedRun.event === event
        && evidenceRun.headBranch === headBranch
        && trustedRun.headBranch === headBranch
        && evidenceRun.headSha === headSha
        && trustedRun.headSha === headSha
        && (!releaseSha || evidenceRun.releaseSha === releaseSha)
        && evidenceRun.status === 'completed'
        && trustedRun.status === 'completed'
        && evidenceRun.conclusion === 'success'
        && trustedRun.conclusion === 'success'
        && evidenceRun.runUrl === trustedRun.runUrl
        && typeof trustedRun.runUrl === 'string'
        && trustedRun.runUrl.startsWith('https://github.com/')
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

    checks.push(result('Signature display metadata', 'info', 'descriptive signature fields are not a trust decision; the promotion workflow verifies the GitHub artifact attestations'))

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

    const sourceRoot = resolve(process.env.RELEASE_SOURCE_DIR ?? projectRoot)
    const provenance = await getGitProvenance(sourceRoot)
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
    const expectedEnvironment = process.env.EXPECTED_RELEASE_ENVIRONMENT
    if (expectedEnvironment && evidence.environment !== expectedEnvironment) {
        checks.push(result('Promotion environment', 'blocked', `evidence environment must be ${expectedEnvironment}`))
    }

    const sourceRunPath = process.env.RELEASE_SOURCE_RUN_FILE
    const qualityRunPath = process.env.RELEASE_QUALITY_RUN_FILE
    if (process.env.RELEASE_ATTESTATIONS_VERIFIED !== 'true' || !sourceRunPath || !qualityRunPath) {
        checks.push(result('Cryptographic artifact attestations', 'blocked', 'GitHub artifact attestations for evidence, migration manifest and release bundle must be verified by the promotion workflow'))
    } else {
        try {
            const trustedSourceRun = JSON.parse(await readFile(resolve(sourceRunPath), 'utf8'))
            const trustedQualityRun = JSON.parse(await readFile(resolve(qualityRunPath), 'utf8'))
            const sourceRunValid = matchesTrustedRun(evidence.sourceRun, trustedSourceRun, {
                workflowPath: '.github/workflows/release-evidence.yml',
                workflowRef: 'main',
                event: 'workflow_dispatch',
                headBranch: 'main',
                headSha: trustedSourceRun.headSha,
                releaseSha: process.env.RELEASE_SHA ?? provenance.commitSha,
            })
            const qualityRunValid = matchesTrustedRun(evidence.qualityRun, trustedQualityRun, {
                workflowPath: '.github/workflows/quality.yml',
                workflowRef: 'dev',
                event: 'push',
                headBranch: 'dev',
                headSha: process.env.RELEASE_SHA ?? provenance.commitSha,
            })
            checks.push(sourceRunValid && qualityRunValid
                ? result('Trusted workflow runs', 'pass', 'evidence attestation comes from protected main and the Quality run succeeded for this exact dev SHA')
                : result('Trusted workflow runs', 'blocked', 'release evidence must match the successful evidence and quality workflow runs for this repository, dev branch and exact release SHA'))
        } catch (error) {
            checks.push(result('Trusted workflow runs', 'blocked', error instanceof Error ? error.message : String(error)))
        }
    }

    const manifestPath = process.env.PUBLISHED_MIGRATION_MANIFEST
    if (!manifestPath) {
        checks.push(result('Published migration manifest', 'blocked', 'PUBLISHED_MIGRATION_MANIFEST is required for promotion'))
    } else {
        try {
            const migration = await evaluateMigrationChecksumManifest({
                migrationDirectory: resolve(sourceRoot, 'server/src/database/migrations'),
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
