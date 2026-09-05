import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDirtyManifestHash, parseGitStatusPorcelain } from './release-provenance.mjs'

test('preserves porcelain status columns and dot-prefixed paths', () => {
    const entries = parseGitStatusPorcelain(' M .github/workflows/quality.yml\n?? scripts/new-file.mjs\n')
    assert.deepEqual(entries, [
        {
            path: '.github/workflows/quality.yml',
            indexStatus: ' ',
            worktreeStatus: 'M',
            staged: false,
            unstaged: true,
            untracked: false,
        },
        {
            path: 'scripts/new-file.mjs',
            indexStatus: '?',
            worktreeStatus: '?',
            staged: false,
            unstaged: false,
            untracked: true,
        },
    ])
})

test('dirty manifest hash is stable regardless of entry order', () => {
    const entries = [
        { path: 'b.ts', indexStatus: ' ', worktreeStatus: 'M', contentSha256: 'b'.repeat(64) },
        { path: 'a.ts', indexStatus: '?', worktreeStatus: '?', contentSha256: 'a'.repeat(64) },
    ]
    assert.equal(buildDirtyManifestHash(entries), buildDirtyManifestHash([...entries].reverse()))
})
