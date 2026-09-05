import assert from 'node:assert/strict'
import test from 'node:test'

import { extractRequiredGateIds, validateReleasePromotion } from './check-release-promotion.mjs'

const requiredGateIds = ['V2-MVP-01', 'V2-OPS-14']
const baseEvidence = {
    schemaVersion: 1,
    environment: 'staging',
    releaseSha: 'a'.repeat(40),
    artifactSha256: 'b'.repeat(64),
    sourceTree: { clean: true, dirtyManifestSha256: 'c'.repeat(64) },
    configFingerprint: 'd'.repeat(64),
    executedAt: '2026-09-05T12:00:00.000Z',
    signature: { algorithm: 'ed25519', signer: 'release-bot', value: 'signed-release-evidence', verificationUri: 'artifact://release-evidence.sig' },
    dependencies: ['staging-api', 'backup-restore'],
    migration: { inventoryChecksum: 'e'.repeat(64), manifestSha256: 'f'.repeat(64) },
    gates: requiredGateIds.map((gateId) => ({
        gateId,
        status: 'pass',
        command: 'npm run check:gate',
        exitCode: 0,
        executedAt: '2026-09-05T12:00:00.000Z',
        evidenceUri: 'artifact://gate-output.txt',
        owner: 'engineering',
        reviewer: 'release-reviewer',
    })),
}

test('extracts the fixed V2 gate IDs without duplicating table references', () => {
    assert.deepEqual(extractRequiredGateIds('| `V2-MVP-01` | one |\n| `V2-MVP-01` | repeat |'), ['V2-MVP-01'])
})

test('accepts a fully bound immutable release evidence envelope', () => {
    const checks = validateReleasePromotion(baseEvidence, {
        now: new Date('2026-09-05T13:00:00.000Z'),
        expectedReleaseSha: baseEvidence.releaseSha,
        currentProvenance: { clean: true, manifestSha256: baseEvidence.sourceTree.dirtyManifestSha256 },
        expectedArtifactSha256: baseEvidence.artifactSha256,
        requiredGateIds,
    })
    assert.equal(checks.some((check) => check.status === 'blocked'), false)
})

test('blocks stale, dirty or waived mandatory release evidence', () => {
    const checks = validateReleasePromotion({
        ...baseEvidence,
        executedAt: '2026-01-01T00:00:00.000Z',
        sourceTree: { clean: false, dirtyManifestSha256: 'c'.repeat(64) },
        gates: requiredGateIds.map((gateId) => ({ ...baseEvidence.gates[0], gateId, waived: true })),
    }, {
        now: new Date('2026-09-05T13:00:00.000Z'),
        expectedReleaseSha: baseEvidence.releaseSha,
        currentProvenance: { clean: false, manifestSha256: baseEvidence.sourceTree.dirtyManifestSha256 },
        expectedArtifactSha256: baseEvidence.artifactSha256,
        requiredGateIds,
    })
    assert.ok(checks.filter((check) => check.status === 'blocked').length >= 3)
})
