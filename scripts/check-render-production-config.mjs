import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const REQUIRED_FRAGMENTS = [
    ['production runtime', 'key: NODE_ENV\n        value: production'],
    ['one-shot migration job', 'preDeployCommand: "npm run release:migrate"'],
    ['migration-free web start', 'startCommand: "npm run start:server"'],
    ['SMTP delivery', 'key: MAIL_MODE\n        value: smtp'],
    ['explicit bootstrap email', 'key: BOOTSTRAP_SUPER_ADMIN_EMAIL\n        sync: false'],
    ['outbox encryption key', 'key: OUTBOX_TOKEN_ENCRYPTION_KEY\n        sync: false'],
    ['explicit cabinet uploads root', 'key: CABINET_UPLOADS_DIR\n        sync: false'],
]

export function assertRenderProductionConfig(source) {
    const missing = REQUIRED_FRAGMENTS
        .filter(([, fragment]) => !source.includes(fragment))
        .map(([name]) => name)

    if (source.includes('key: MAIL_MODE\n        value: logger')) {
        missing.push('no production logger mail mode')
    }

    if (missing.length > 0) {
        throw new Error(`Render production config contract is missing: ${missing.join(', ')}`)
    }

    return true
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    assertRenderProductionConfig(await readFile('render.yaml', 'utf8'))
    console.log('Render production config contract passed.')
}
