import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const ROUTER_COMPATIBILITY_CONTRACT = [
    {
        file: 'src/main.tsx',
        required: ['<BrowserRouter useTransitions={false}>'],
        forbidden: ['unstable_useTransitions'],
    },
    {
        file: 'src/app/next/NextClientApp.tsx',
        required: ['<BrowserRouter useTransitions={false}>'],
        forbidden: ['unstable_useTransitions'],
    },
]

export async function evaluateRouterCompatibility(root = projectRoot) {
    const results = []

    for (const contract of ROUTER_COMPATIBILITY_CONTRACT) {
        const source = await readFile(resolve(root, contract.file), 'utf8')
        const missing = contract.required.filter((fragment) => !source.includes(fragment))
        const forbidden = contract.forbidden.filter((fragment) => source.includes(fragment))

        results.push({
            file: contract.file,
            status: missing.length === 0 && forbidden.length === 0 ? 'pass' : 'blocked',
            missing,
            forbidden,
        })
    }

    return results
}

export function formatRouterCompatibility(results) {
    const lines = ['React Router compatibility contract']

    for (const result of results) {
        const details = [
            result.missing.length ? `missing: ${result.missing.join(', ')}` : '',
            result.forbidden.length ? `forbidden: ${result.forbidden.join(', ')}` : '',
        ].filter(Boolean)

        lines.push(`[${result.status.toUpperCase()}] ${result.file}${details.length ? ` — ${details.join('; ')}` : ''}`)
    }

    return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const results = await evaluateRouterCompatibility()
    console.log(formatRouterCompatibility(results))

    if (results.some((result) => result.status !== 'pass')) {
        process.exitCode = 1
    }
}
