import { readFile } from 'node:fs/promises'

export function assertSecurityHeaderSource(sourceMap) {
    const required = [
        ['app', sourceMap.app, "import helmet from '@fastify/helmet'"],
        ['metrics', sourceMap.metrics, "'cache-control': 'no-store'"],
        ['users', sourceMap.users, "'cache-control': 'no-store'"],
        ['audit', sourceMap.audit, "'cache-control': 'no-store'"],
    ]
    const missing = required
        .filter(([, source, fragment]) => !source.includes(fragment))
        .map(([name]) => name)

    if (missing.length > 0) throw new Error(`Security header contract is missing: ${missing.join(', ')}`)
    return true
}

const sources = Object.fromEntries(await Promise.all([
    ['app', 'server/src/app.ts'],
    ['metrics', 'server/src/routes/metrics.route.ts'],
    ['users', 'server/src/modules/users/users.routes.ts'],
    ['audit', 'server/src/modules/admin/audit-log.service.ts'],
].map(async ([name, path]) => [name, await readFile(path, 'utf8')])))

assertSecurityHeaderSource(sources)
console.log('Security header contract check passed.')
