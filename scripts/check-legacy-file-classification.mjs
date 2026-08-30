import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(new URL('..', import.meta.url).pathname)
const manifestPath = resolve(projectRoot, 'docs/architecture/legacy-cleanup-manifest.json')
const classificationPath = resolve(projectRoot, 'docs/architecture/legacy-file-classification.json')
const legacySignalPatterns = [
    /^docs\/archive\//,
    /^server\/src\/database\/migrations\/\d+.*(?:legacy|subscription|payment|commission)/i,
    /^(vite\.config\.ts|src\/vite-env\.d\.ts)$/,
    /^e2e\/__screenshots__\/.*pricing-/,
    /^docs\/design\/proposals\/.*pricing-/,
    /^public\/images\/cabinets\/.*wellness/i,
]

function readTrackedFiles() {
    const output = execFileSync('git', ['ls-files', '-z'], { cwd: projectRoot })
    return output.toString('utf8').split('\0').filter(Boolean)
}

function compilePattern(entry) {
    return new RegExp(entry.pattern, entry.flags ?? '')
}

function familyPrefix(path) {
    return path.endsWith('/') ? path : `${path}/`
}

function isInsidePath(file, path) {
    return file === path || file.startsWith(familyPrefix(path))
}

function classifyManifestPath(file, families) {
    for (const family of families) {
        const matchedPath = family.paths.find((path) => isInsidePath(file, path))
        if (!matchedPath) continue

        return {
            category: `manifest:${family.id}`,
            disposition: family.status === 'retained_compatibility' ? 'retained_compatibility' : family.status,
            reason: family.deleteGate,
            path: matchedPath,
        }
    }

    return null
}

function isLegacyCandidate(file, families, entries) {
    return Boolean(
        classifyManifestPath(file, families)
        || entries.some((entry) => compilePattern(entry).test(file))
        || legacySignalPatterns.some((pattern) => pattern.test(file)),
    )
}

export async function runLegacyFileClassification() {
    const [manifest, classification] = await Promise.all([
        readFile(manifestPath, 'utf8').then(JSON.parse),
        readFile(classificationPath, 'utf8').then(JSON.parse),
    ])

    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.legacyFamilies)) {
        throw new Error('Legacy cleanup manifest is missing a supported family inventory')
    }
    if (classification.schemaVersion !== 1 || classification.unknownPolicy !== 'fail' || !Array.isArray(classification.entries)) {
        throw new Error('Legacy file classification manifest is missing a supported fail-closed policy')
    }

    const files = readTrackedFiles()
    const failures = []
    const classified = []
    const matchedEntryIds = new Set()

    for (const file of files) {
        const manifestMatch = classifyManifestPath(file, manifest.legacyFamilies)
        if (manifestMatch) {
            classified.push({ file, ...manifestMatch })
            continue
        }

        const entry = classification.entries.find((candidate) => compilePattern(candidate).test(file))
        if (entry) {
            matchedEntryIds.add(entry.id)
            classified.push({ file, category: entry.id, disposition: entry.disposition, reason: entry.reason })
            continue
        }

        if (isLegacyCandidate(file, manifest.legacyFamilies, classification.entries)) {
            failures.push(`${file}: no classification entry`)
        }
    }

    const malformedEntries = classification.entries
        .filter((entry) => typeof entry.id !== 'string' || typeof entry.pattern !== 'string' || typeof entry.disposition !== 'string')
        .map((entry) => JSON.stringify(entry))
    if (malformedEntries.length > 0) failures.push(`invalid classification entries: ${malformedEntries.join(', ')}`)

    const unusedEntries = classification.entries
        .filter((entry) => !matchedEntryIds.has(entry.id))
        .map((entry) => entry.id)

    return {
        files,
        classified,
        failures,
        unusedEntries,
        counts: classified.reduce((counts, item) => {
            counts[item.disposition] = (counts[item.disposition] ?? 0) + 1
            return counts
        }, {}),
    }
}

export function formatLegacyFileClassification(result) {
    const lines = ['AutoCare Hub legacy file classification']
    lines.push(`Tracked files: ${result.files.length}`)
    lines.push(`Classified legacy/compatibility files: ${result.classified.length}`)
    for (const [disposition, count] of Object.entries(result.counts).sort(([left], [right]) => left.localeCompare(right))) {
        lines.push(`- ${disposition}: ${count}`)
    }
    if (result.unusedEntries.length > 0) lines.push(`Unmatched optional patterns: ${result.unusedEntries.join(', ')}`)
    if (result.failures.length > 0) {
        lines.push('Unclassified files:')
        result.failures.forEach((failure) => lines.push(`- ${failure}`))
    }
    lines.push(result.failures.length === 0
        ? 'Result: every retained legacy candidate has an explicit disposition and removal reason.'
        : `Result: blocked by ${result.failures.length} unclassified legacy candidate(s).`)
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = await runLegacyFileClassification()
    if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
    else console.log(formatLegacyFileClassification(result))
    if (result.failures.length > 0) process.exitCode = 1
}
