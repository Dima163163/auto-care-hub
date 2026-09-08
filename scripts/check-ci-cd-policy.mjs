import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

export function validateCiCdPolicy({ quality, promotion, protection, readme }) {
    const checks = [
        ['Quality runs for pull requests', /on:[\t ]*\n[\t ]+pull_request:/.test(quality)],
        ['Quality runs on dev and main pushes', /push:[\t ]*\n(?:[\t ]+[^\n]*\n)*[\t ]+branches:[\t ]*\n[\t ]+- dev[\t ]*\n[\t ]+- main/.test(quality)],
        ['Quality exposes one aggregate required check', /name:\s+Application CI/.test(quality) && /if:\s+\$\{\{\s*always\(\)\s*\}\}/.test(quality)],
        ['Aggregate check depends on every application gate', [
            'production-promotion-policy',
            'security',
            'frontend',
            'backend',
            'browser-e2e',
            'real-full-stack',
        ].every((job) => new RegExp(`\\n\\s+- ${job}\\s*$`, 'm').test(quality))],
        ['Promotion waits for the completed Quality workflow', /push:[\t ]*\n[\t ]+branches:[\t ]*\n[\t ]+- dev/.test(promotion) && /actions\/workflows\/quality\.yml\/runs/.test(promotion) && /status.*completed/.test(promotion)],
        ['Promotion is limited to the trusted dev branch', /branches:[\t ]*\n[\t ]+- dev/.test(promotion) && /branch=dev/.test(promotion) && /head_sha/.test(promotion)],
        ['Promotion requires successful CI', /conclusion.*success/.test(promotion) && /gh pr checks/.test(promotion)],
        ['Promotion targets main through a pull request', /--base main/.test(promotion) && /--head dev/.test(promotion) && /gh pr merge/.test(promotion)],
        ['Repository protection names the aggregate required check', /Quality \/ Application CI/.test(protection)],
        ['Repository documentation describes automated promotion', /automated promotion|auto.?merge|automatic promotion/i.test(protection) && /dev.*main|main.*dev/i.test(readme)],
    ]

    return checks.map(([name, passed]) => ({ name, passed }))
}

export async function readCiCdPolicySources() {
    const read = (path) => readFile(resolve(projectRoot, path), 'utf8')
    const [quality, promotion, protection, readme] = await Promise.all([
        read('.github/workflows/quality.yml'),
        read('.github/workflows/promote-dev-to-main.yml'),
        read('docs/REPOSITORY_PROTECTION.md'),
        read('README.md'),
    ])
    return { quality, promotion, protection, readme }
}

async function main() {
    const checks = validateCiCdPolicy(await readCiCdPolicySources())
    const failed = checks.filter(({ passed }) => !passed)
    for (const check of checks) console.log(`[${check.passed ? 'PASS' : 'FAIL'}] ${check.name}`)
    if (failed.length > 0) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
