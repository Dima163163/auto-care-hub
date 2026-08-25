import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.cwd()
const ignoredDirectories = new Set([
    '.git',
    '.agents',
    '.codex',
    '.next',
    'coverage',
    'dist',
    'node_modules',
    'playwright-report',
    'test-results',
])
const historicalMigrationDirectory = join('server', 'src', 'database', 'migrations')
const prohibitedProvider = ['st', 'ri', 'pe'].join('')
const prohibitedFlag = ['PAYMENTS', 'ENABLED'].join('_').toLowerCase()

async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        if (ignoredDirectories.has(entry.name)) continue

        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectFiles(path))
            continue
        }

        if (entry.isFile()) files.push(path)
    }

    return files
}

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
