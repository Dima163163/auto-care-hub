import { spawnSync } from 'node:child_process'

export function getDockerDaemonFailure(result) {
    if (result.status === 0) return null

    const detail = String(result.stderr ?? '').trim()
    if (/cannot connect|failed to connect|docker api|is the docker daemon running/i.test(detail)) {
        return 'Docker daemon is unavailable. Start Docker Desktop and retry npm run db:up.'
    }

    return 'Docker CLI could not reach a working daemon. Verify Docker Desktop or the configured Docker context, then retry npm run db:up.'
}

export function checkDockerDaemon(run = spawnSync) {
    let result
    try {
        result = run('docker', ['info', '--format', '{{.ServerVersion}}'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        })
    } catch {
        throw new Error('Docker CLI is unavailable. Install Docker Desktop and retry npm run db:up.')
    }
    const failure = getDockerDaemonFailure(result)

    if (failure) {
        throw new Error(failure)
    }

    return String(result.stdout ?? '').trim()
}

if (process.argv[1]?.endsWith('check-docker.mjs')) {
    try {
        const version = checkDockerDaemon()
        console.log(`Docker daemon is ready${version ? ` (server ${version})` : ''}.`)
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Docker daemon check failed.')
        process.exitCode = 1
    }
}
