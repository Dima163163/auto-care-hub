// Fixed audit phases. Never accepts arbitrary commands or external targets.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const server = path.join(root, 'server')
const evidence = fileURLToPath(new URL('./', import.meta.url))
const phase = process.argv[2]
function parseEnvironment(source) {
    return Object.fromEntries(source.trim().split('\n').map((line) => {
        const index = line.indexOf('=')
        assert.ok(index > 0)
        const key = line.slice(0, index)
        assert.ok(!['HOME', 'PATH', 'CODEX_HOME', 'NODE_OPTIONS'].includes(key))
        return [key, line.slice(index + 1)]
    }))
}
const test = parseEnvironment(await readFile('/private/tmp/autocare-audit-followup.env', 'utf8'))
const real = parseEnvironment(await readFile('/private/tmp/autocare-audit-followup-real.env', 'utf8'))
const next = parseEnvironment(await readFile('/private/tmp/autocare-audit-followup-next.env', 'utf8'))
assert.equal(new URL(test.DATABASE_URL).host, '127.0.0.1:29442')
assert.equal(new URL(real.DATABASE_URL).host, '127.0.0.1:29442')
assert.equal(new URL(next.NEXT_PUBLIC_API_ORIGIN).host, '127.0.0.1:4196')
assert.equal(next.NEXT_DIST_DIR, '.next-real-e2e')
async function run(command, args, environment, { cwd = root, log } = {}) {
    console.log(`Audit phase ${phase}: ${path.basename(command)} ${args.join(' ')}`)
    const { open } = await import('node:fs/promises')
    const output = log ? await open(`/private/tmp/autocare-audit-followup-${log}.log`, 'w') : null
    try {
        await new Promise((resolve, reject) => {
            const child = spawn(command, args, { cwd, env: { ...process.env, ...environment }, stdio: ['ignore', output?.fd ?? 'inherit', output?.fd ?? 'inherit'] })
            child.once('error', reject)
            child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Audit phase ${phase}: exit ${code ?? signal}; log ${log ?? 'console'}`)))
        })
    } finally { await output?.close() }
}
if (phase === 'finish') {
    const self = fileURLToPath(import.meta.url)
    await run(process.execPath, [self, 'backup-restore'], {})
    await run(process.execPath, [self, 'benchmark-http'], {})
    const { open } = await import('node:fs/promises')
    const output = await open('/private/tmp/autocare-audit-followup-next-http.log', 'w')
    const serving = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3200'], { cwd: root, env: { ...process.env, ...next }, stdio: ['ignore', output.fd, output.fd] })
    try {
        let ready = false
        for (let attempt = 0; attempt < 40; attempt += 1) {
            try { ready = (await fetch('http://127.0.0.1:3200/', { signal: AbortSignal.timeout(1500) })).ok } catch { /* startup only */ }
            if (ready) break
            await new Promise((resolve) => setTimeout(resolve, 500))
        }
        assert.ok(ready, 'Own production Next did not become ready')
        await run(process.execPath, [self, 'http-checks'], {})
    } finally {
        const exited = new Promise((resolve) => serving.once('exit', resolve))
        serving.kill('SIGTERM')
        const timeout = setTimeout(() => serving.kill('SIGKILL'), 10000)
        try { await exited } finally { clearTimeout(timeout); await output.close() }
    }
    await run(process.execPath, [self, 'e2e'], {})
} else if (phase === 'build-live') {
    await run('npm', ['run', 'build'], next, { log: 'next-build' })
    await run(process.execPath, ['scripts/check-production-fixture-leakage.mjs', '--format', 'next', '--dist-dir', '.next-real-e2e'], next, { log: 'fixture-guard' })
} else if (phase === 'start-next-http') {
    await run('npm', ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', '3200'], next, { log: 'next-http' })
} else if (phase === 'http-checks') {
    const ids = JSON.parse(await readFile('/private/tmp/autocare-audit-followup-provider-ids.json', 'utf8'))
    await run(process.execPath, ['scripts/check-next-csp.mjs', '--url', 'http://127.0.0.1:3200'], next, { log: 'csp-http' })
    await run(process.execPath, ['scripts/check-seo-release.mjs', '--url', 'http://127.0.0.1:3200'], { ...next, SEO_PROVIDER_PATHS: ids.map((id) => `/services/${id}`).join(',') }, { log: 'seo-http' })
} else if (phase === 'e2e') {
    await run(process.execPath, ['scripts/run-real-api-e2e.mjs'], next, { log: 'real-e2e' })
} else if (phase === 'db-proofs') {
    await run(process.execPath, ['docs/audits/evidence/2026-10-13/reproduce-postgres.mjs'], test, { log: 'postgres-reproductions' })
} else if (phase === 'benchmark-http') {
    await run(process.execPath, ['dist/scripts/benchmark-autocare-discovery.js'], { ...real, BENCHMARK_DISCOVERY_BASE_URL: 'http://127.0.0.1:4196', BENCHMARK_DISCOVERY_MARKET: 'moscow', BENCHMARK_DISCOVERY_ITERATIONS: '80', BENCHMARK_DISCOVERY_CONCURRENCY: '8' }, { cwd: server, log: 'http-benchmark' })
} else if (phase === 'backup-restore') {
    const backupDirectory = '/private/tmp/autocare-audit-followup-backups'
    const passwordPath = '/private/tmp/autocare-audit-followup-backup-password'
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 })
    await writeFile(passwordPath, randomBytes(32).toString('hex'), { mode: 0o600 })
    const backupEnvironment = { ...test, AUTOCARE_BACKUP_ENV_LOADED: 'true', BACKUP_DIR: backupDirectory, BACKUP_ENCRYPTION_PASSWORD_FILE: passwordPath }
    const before = new Set(await readdir(backupDirectory))
    await run('bash', ['scripts/backup.sh'], backupEnvironment, { cwd: server, log: 'backup' })
    const added = (await readdir(backupDirectory)).filter((name) => name.endsWith('.sql.gz.enc') && !before.has(name))
    assert.equal(added.length, 1)
    await run('bash', ['scripts/restore.sh', path.join(backupDirectory, added[0]), 'autocare_audit_restore_test'], backupEnvironment, { cwd: server, log: 'restore' })
    const require = createRequire(path.join(server, 'package.json'))
    const { Client } = require('pg')
    const source = new Client({ connectionString: test.DATABASE_URL })
    const restoredUrl = new URL(test.DATABASE_URL)
    restoredUrl.pathname = '/autocare_audit_restore_test'
    const restored = new Client({ connectionString: restoredUrl.toString() })
    await source.connect()
    await restored.connect()
    try {
        const { rows: tables } = await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        let rows = 0
        for (const { tablename } of tables) {
            assert.match(tablename, /^[a-z_][a-z0-9_]*$/)
            const query = `SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text)),'')) AS digest FROM "${tablename}" t`
            const left = (await source.query(query)).rows[0]
            const right = (await restored.query(query)).rows[0]
            assert.deepEqual(right, left, `Restored table mismatch: ${tablename}`)
            rows += left.count
        }
        Object.assign(process.env, test)
        const { createEncryptedFieldTransformer } = await import(new URL('../../../../server/dist/shared/security/data-encryption/field-encryption.js', import.meta.url))
        const storedUser = (await restored.query('SELECT "name" FROM "users" LIMIT 1')).rows[0]
        const decryptedName = createEncryptedFieldTransformer('users', 'name', 'text').from(storedUser.name)
        assert.equal(typeof decryptedName, 'string')
        assert.ok(decryptedName.length > 0)
        assert.notEqual(decryptedName, storedUser.name)
        const result = { encryptedBackup: true, checksumVerified: true, restoredDatabase: 'disposable audit restore target', tablesWithMatchingCountsAndContentDigests: tables.length, rows, encryptedNameDecryptsWithRetainedLocalAuditKey: true, productionRecovery: false }
        await writeFile(path.join(evidence, 'backup-results.json'), JSON.stringify(result, null, 2) + '\n')
        console.log(JSON.stringify(result))
    } finally { await source.end(); await restored.end() }
} else {
    throw new Error('Unknown fixed audit phase')
}
console.log(`Audit phase ${phase}: completed.`)
