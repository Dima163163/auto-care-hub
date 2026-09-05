import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

function sha256(value) {
    return createHash('sha256').update(value).digest('hex')
}

function runGit(root, args, trim = true) {
    try {
        const output = execFileSync('git', args, { cwd: root, encoding: 'utf8' })
        return trim ? output.trim() : output.replace(/\r?\n$/, '')
    } catch {
        return null
    }
}

function parseStatusLine(line) {
    const value = String(line)
    if (value.length < 4) return null
    const indexStatus = value[0]
    const worktreeStatus = value[1]
    const path = value.slice(3).replaceAll('\\', '/')
    return {
        path,
        indexStatus,
        worktreeStatus,
        staged: indexStatus !== ' ' && indexStatus !== '?',
        unstaged: worktreeStatus !== ' ' && worktreeStatus !== '?',
        untracked: indexStatus === '?' && worktreeStatus === '?',
    }
}

export function parseGitStatusPorcelain(output) {
    return String(output ?? '')
        .split(/\r?\n/)
        .map((line) => parseStatusLine(line))
        .filter((entry) => entry !== null)
}

export function buildDirtyManifestHash(entries) {
    const normalized = entries
        .map((entry) => ({
            path: String(entry.path).replaceAll('\\', '/'),
            indexStatus: String(entry.indexStatus ?? ' '),
            worktreeStatus: String(entry.worktreeStatus ?? ' '),
            contentSha256: entry.contentSha256 ?? null,
        }))
        .sort((left, right) => left.path.localeCompare(right.path))
    return sha256(JSON.stringify(normalized))
}

export async function getGitProvenance(root) {
    const projectRoot = resolve(root)
    const statusOutput = runGit(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all'], false)
    const entries = parseGitStatusPorcelain(statusOutput ?? '')
    const withContent = await Promise.all(entries.map(async (entry) => {
        if (entry.indexStatus === 'D' || entry.worktreeStatus === 'D') {
            return { ...entry, contentSha256: null }
        }
        try {
            return { ...entry, contentSha256: sha256(await readFile(resolve(projectRoot, entry.path))) }
        } catch {
            return { ...entry, contentSha256: null }
        }
    }))
    return {
        available: statusOutput !== null,
        commitSha: runGit(projectRoot, ['rev-parse', 'HEAD']),
        clean: statusOutput === '' && statusOutput !== null,
        staged: withContent.filter((entry) => entry.staged).map((entry) => entry.path),
        unstaged: withContent.filter((entry) => entry.unstaged).map((entry) => entry.path),
        untracked: withContent.filter((entry) => entry.untracked).map((entry) => entry.path),
        manifestSha256: buildDirtyManifestHash(withContent),
        entries: withContent,
    }
}

export async function sha256File(filePath) {
    return sha256(await readFile(resolve(filePath)))
}
