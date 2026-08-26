import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const read = (path) => readFile(path, 'utf8')

export async function assertNextRuntimeBoundary() {
    const [packageSource, renderSource, viteConfig, eslintConfig, serverVitest] = await Promise.all([
        read('package.json'),
        read('render.yaml'),
        read('vite.config.ts'),
        read('eslint.config.js'),
        read('server/vitest.config.ts'),
    ])
    const packageJson = JSON.parse(packageSource)
    const scripts = packageJson.scripts ?? {}
    const productionChecks = [
        ['build', scripts.build, /next build/],
        ['start', scripts.start, /^next start$/],
        ['Render build', renderSource, /name: autocare-hub-client[\s\S]*?buildCommand: "npm ci && npm run build"/],
        ['Render start', renderSource, /name: autocare-hub-client[\s\S]*?startCommand: "npm run start"/],
    ]

    const missing = productionChecks
        .filter(([, source, pattern]) => typeof source !== 'string' || !pattern.test(source))
        .map(([name]) => name)

    const productionCommands = [scripts.build, scripts.start]
    if (productionCommands.some((command) => typeof command !== 'string' || /\bvite\b/.test(command))) {
        missing.push('no Vite production command')
    }

    const requiredViteUsage = [
        ['@tailwindcss/vite', viteConfig],
        ['@vitejs/plugin-react', viteConfig],
        ['vite-plugin-pwa', viteConfig],
        ['eslint-plugin-react-refresh', eslintConfig],
        ['vite-tsconfig-paths', serverVitest],
    ]
    const unusedVitePackages = requiredViteUsage
        .filter(([name, source]) => !source.includes(name))
        .map(([name]) => name)

    if (unusedVitePackages.length > 0) {
        missing.push(`unused compatibility dependencies: ${unusedVitePackages.join(', ')}`)
    }

    if (missing.length > 0) {
        throw new Error(`Next.js runtime boundary check failed: ${missing.join('; ')}`)
    }

    return {
        productionRuntime: 'next start',
        retainedCompatibilityPackages: requiredViteUsage.map(([name]) => name),
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = await assertNextRuntimeBoundary()
    console.log(`Next.js production boundary passed (${result.productionRuntime}); Vite compatibility packages are all referenced.`)
}
