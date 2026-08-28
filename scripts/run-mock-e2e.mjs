import { spawnSync } from 'node:child_process'
import { lstat, readFile, rm, writeFile } from 'node:fs/promises'

const nextEnvPath = new URL('../next-env.d.ts', import.meta.url)
const nextMockDistPath = new URL('../.next-mock-e2e/', import.meta.url)
const originalNextEnv = await readFile(nextEnvPath, 'utf8')

let exitCode = 1
try {
    const result = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['playwright', 'test', ...process.argv.slice(2)],
        {
            env: {
                ...process.env,
                NEXT_DIST_DIR: '.next-mock-e2e',
                PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT ?? '4173',
            },
            stdio: 'inherit',
        },
    )
    if (result.error) throw result.error
    exitCode = result.status ?? (result.signal ? 1 : 0)
} finally {
    await writeFile(nextEnvPath, originalNextEnv)

    try {
        const distStat = await lstat(nextMockDistPath)
        if (distStat.isDirectory() && !distStat.isSymbolicLink()) {
            await rm(nextMockDistPath, { recursive: true, force: true })
        }
    } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error
        }
    }
}

process.exitCode = exitCode
