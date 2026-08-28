import { spawnSync } from 'node:child_process'
import { lstat, readFile, rm, writeFile } from 'node:fs/promises'

const nextEnvPath = new URL('../next-env.d.ts', import.meta.url)
const nextRealDistPath = new URL('../.next-real-e2e/', import.meta.url)
const originalNextEnv = await readFile(nextEnvPath, 'utf8')

let exitCode = 1
try {
    const result = spawnSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['playwright', 'test', '-c', 'playwright.real.config.ts'],
        { stdio: 'inherit' },
    )
    if (result.error) throw result.error
    exitCode = result.status ?? (result.signal ? 1 : 0)
} finally {
    // Next rewrites this generated reference for a custom distDir. Restoring
    // the tracked canonical file keeps the real-API test isolated and leaves
    // an interactive `.next` development session untouched.
    await writeFile(nextEnvPath, originalNextEnv)

    try {
        const distStat = await lstat(nextRealDistPath)
        if (distStat.isDirectory() && !distStat.isSymbolicLink()) {
            await rm(nextRealDistPath, { recursive: true, force: true })
        }
    } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error
        }
    }
}

process.exitCode = exitCode
