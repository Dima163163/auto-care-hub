import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const ignoredDirectories = new Set([
    '.git',
    '.agents',
    '.codex',
    '.next',
    'coverage',
    'docs',
    'dist',
    'e2e',
    'node_modules',
    'playwright-report',
    'test-results',
])
const generatedNextDirectoryPattern = /^\.next-(?:real|mock)(?:-|$)/
const historicalMigrationDirectory = join('server', 'src', 'database', 'migrations')
const prohibitedProvider = ['st', 'ri', 'pe'].join('')
const prohibitedFlag = ['PAYMENTS', 'ENABLED'].join('_').toLowerCase()

export function isIgnoredDirectory(name) {
    return ignoredDirectories.has(name) || generatedNextDirectoryPattern.test(name)
}

async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        if (isIgnoredDirectory(entry.name)) continue

        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectFiles(path))
            continue
        }

        if (entry.isFile()) files.push(path)
    }

    return files
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const files = await collectFiles(root)
    const violations = []

    for (const file of files) {
        const projectPath = relative(root, file)
        if (projectPath.startsWith(historicalMigrationDirectory)) continue

        const contents = await readFile(file, 'utf8').catch(() => null)
        if (contents === null) continue

        const lowerCaseContents = contents.toLowerCase()
        if (lowerCaseContents.includes(prohibitedProvider) || lowerCaseContents.includes(prohibitedFlag)) {
            violations.push(projectPath)
        }
    }

    if (violations.length > 0) {
        throw new Error(`Legacy payment-provider references are forbidden outside migration history:\n${violations.join('\n')}`)
    }

    console.log('Legacy payment-provider runtime references are absent.')
}
