import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'

const allowedNames = [
    'NODE_ENV', 'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME',
    'DATABASE_USER', 'DATABASE_PASSWORD', 'BACKUP_DIR',
    'BACKUP_ENCRYPTION_PASSWORD_FILE', 'BACKUP_ENCRYPTION_ITERATIONS',
    'ALLOW_UNENCRYPTED_LOCAL_BACKUP',
]

export function parseBackupEnvironment(source, environment) {
    const parsed = parseEnv(source)
    const next = { ...environment, AUTOCARE_BACKUP_ENV_LOADED: 'true' }
    for (const name of allowedNames) {
        if (environment[name] === undefined && parsed[name] !== undefined) next[name] = parsed[name]
    }
    return next
}

async function main() {
    try {
        const source = await readFile(resolve('.env'), 'utf8')
        const script = fileURLToPath(new URL('./backup.sh', import.meta.url))
        const environment = parseBackupEnvironment(source, process.env)
        const child = spawn('bash', [script, ...process.argv.slice(3)], { env: environment, stdio: 'inherit' })
        process.exitCode = await new Promise((accept, reject) => {
            child.once('error', reject)
            child.once('exit', (code, signal) => accept(code ?? (signal === 'SIGINT' ? 130 : 1)))
        })
    } catch {
        console.error('Backup configuration could not be loaded.')
        process.exitCode = 78
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
