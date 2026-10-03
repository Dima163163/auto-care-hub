import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'

const exec = promisify(execFile)
const restoreScript = fileURLToPath(new URL('./restore.sh', import.meta.url))
const backupScript = fileURLToPath(new URL('./backup.sh', import.meta.url))
const sql = '-- synthetic backup only\nSELECT 1;\n'

async function fixture(run) {
    const directory = await mkdtemp(join(tmpdir(), 'autocare-auth-backup-'))
    try {
        const bin = join(directory, 'bin')
        const staging = join(directory, 'staging')
        await mkdir(bin)
        await mkdir(staging)
        const marker = join(directory, 'psql-input')
        const passwordFile = join(directory, 'key')
        await writeFile(passwordFile, 'synthetic-only-backup-password\n', { mode: 0o600 })
        await writeFile(join(bin, 'psql'), '#!/usr/bin/env node\nconst fs = require("node:fs"); fs.writeFileSync(process.env.TEST_PSQL_OUTPUT, fs.readFileSync(0));\n')
        await writeFile(join(bin, 'pg_dump'), `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(sql)});\n`)
        await chmod(join(bin, 'psql'), 0o700)
        await chmod(join(bin, 'pg_dump'), 0o700)
        const environment = {
            ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, TMPDIR: staging,
            NODE_ENV: 'test', TEST_PSQL_OUTPUT: marker,
            DATABASE_HOST: '127.0.0.1', DATABASE_PORT: '5432', DATABASE_NAME: 'autocarehub_test',
            DATABASE_USER: 'synthetic', DATABASE_PASSWORD: 'synthetic',
            RESTORE_DATABASE_HOST: '127.0.0.1', RESTORE_DATABASE_PORT: '5432',
            RESTORE_DATABASE_USER: 'synthetic', RESTORE_DATABASE_PASSWORD: 'synthetic',
            BACKUP_ENCRYPTION_PASSWORD_FILE: passwordFile,
            ALLOW_UNENCRYPTED_LOCAL_RESTORE: 'true', ALLOW_SAME_DATABASE_RESTORE: 'false',
        }
        const archive = async (data, name = 'fixture.sql.gz.enc') => {
            const path = join(directory, name)
            await writeFile(path, data)
            await writeFile(`${path}.sha256`, `${createHash('sha256').update(data).digest('hex')}  ${name}\n`)
            return path
        }
        const restore = (path, overrides = {}) => exec('bash', [restoreScript, path, 'autocarehub_restore_test'], { cwd: directory, env: { ...environment, ...overrides } })
        const assertNoPsql = async () => {
            await assert.rejects(access(marker))
            assert.deepEqual(await readdir(staging), [])
        }
        await run({ directory, marker, passwordFile, environment, archive, restore, assertNoPsql })
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
}

async function encrypted(context, content = gzipSync(sql)) {
    const { encryptBackupFile } = await import('./backup-crypto.mjs')
    const source = join(context.directory, 'compressed')
    const output = join(context.directory, 'encrypted')
    await writeFile(source, content)
    await encryptBackupFile({ inputPath: source, outputPath: output, passwordFile: context.passwordFile })
    return readFile(output)
}

test('corrupt gzip never starts psql or leaves plaintext staging', async () => fixture(async (context) => {
    const payload = gzipSync(sql)
    payload[payload.length - 8] ^= 1
    await assert.rejects(context.restore(await context.archive(payload, 'fixture.sql.gz')))
    await context.assertNoPsql()
}))

test('authenticated encrypted backup supplies the complete SQL only after verification', async () => fixture(async (context) => {
    const data = await encrypted(context)
    assert.equal(data.subarray(0, 8).toString(), 'ACHBKP01')
    const { stdout } = await context.restore(await context.archive(data))
    assert.match(stdout, /Restore completed successfully/)
    assert.equal(await readFile(context.marker, 'utf8'), sql)
    assert.equal((await stat(join(context.directory, 'encrypted'))).mode & 0o777, 0o600)
    assert.deepEqual(await readdir(context.environment.TMPDIR), [])
}))

for (const [name, mutate] of [
    ['header', (data) => { data[12] ^= 1; return data }],
    ['ciphertext', (data) => { data[40] ^= 1; return data }],
    ['tag', (data) => { data[data.length - 1] ^= 1; return data }],
    ['truncation', (data) => data.subarray(0, data.length - 7)],
]) {
    test(`recomputed checksum cannot authorize modified ${name}`, async () => fixture(async (context) => {
        const data = mutate(await encrypted(context))
        await assert.rejects(context.restore(await context.archive(data)))
        await context.assertNoPsql()
    }))
}

test('wrong password never starts psql', async () => fixture(async (context) => {
    const data = await encrypted(context)
    await writeFile(context.passwordFile, 'different-synthetic-password\n')
    await assert.rejects(context.restore(await context.archive(data)))
    await context.assertNoPsql()
}))

test('authenticated but invalid gzip never starts psql', async () => fixture(async (context) => {
    const data = await encrypted(context, Buffer.from('not a gzip archive'))
    await assert.rejects(context.restore(await context.archive(data)))
    await context.assertNoPsql()
}))

test('legacy unauthenticated encrypted format is rejected before SQL execution', async () => fixture(async (context) => {
    await assert.rejects(context.restore(await context.archive(Buffer.from('Salted__synthetic legacy CBC archive'))))
    await context.assertNoPsql()
}))

test('production cannot opt into an unauthenticated plaintext restore', async () => fixture(async (context) => {
    await assert.rejects(context.restore(await context.archive(gzipSync(sql), 'fixture.sql.gz'), { NODE_ENV: 'production' }))
    await context.assertNoPsql()
}))

test('backup script creates an authenticated archive that restore can consume', async () => fixture(async (context) => {
    const backupDir = join(context.directory, 'backups')
    const result = await exec('bash', [backupScript], { cwd: context.directory, env: { ...context.environment, BACKUP_DIR: backupDir } })
    const path = result.stdout.match(/Backup successful: (.+)\n/)?.[1]
    assert.ok(path)
    assert.equal((await readFile(path)).subarray(0, 8).toString(), 'ACHBKP01')
    await context.restore(path)
    assert.equal(await readFile(context.marker, 'utf8'), sql)
}))

test('backup loads quoted dotenv values without executing shell substitutions', async () => fixture(async (context) => {
    const backupDir = join(context.directory, 'backups with spaces')
    const key = join(context.directory, 'key with spaces')
    await writeFile(key, 'synthetic password with spaces\n')
    const dumpMarker = join(context.directory, 'dump-password')
    const bin = join(context.directory, 'bin', 'pg_dump')
    await writeFile(bin, `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(dumpMarker)}, process.env.PGPASSWORD); process.stdout.write(${JSON.stringify(sql)});\n`)
    await writeFile(join(context.directory, '.env'), `DATABASE_PASSWORD="synthetic password $(do-not-execute)" # comment\nBACKUP_DIR="${backupDir}"\nBACKUP_ENCRYPTION_PASSWORD_FILE="${key}"\nPATH=/must-not-load\n`)
    const environment = { ...context.environment }
    delete environment.DATABASE_PASSWORD
    delete environment.BACKUP_ENCRYPTION_PASSWORD_FILE
    const result = await exec('bash', [backupScript], { cwd: context.directory, env: environment })
    const path = result.stdout.match(/Backup successful: (.+)\n/)?.[1]
    assert.ok(path?.startsWith(await realpath(backupDir)))
    assert.equal(await readFile(dumpMarker, 'utf8'), 'synthetic password $(do-not-execute)')
    assert.equal((await readFile(path)).subarray(0, 8).toString(), 'ACHBKP01')
    assert.ok(!result.stdout.includes('synthetic password'))
}))

test('encrypt refuses an existing output without altering it', async () => fixture(async (context) => {
    const { encryptBackupFile } = await import('./backup-crypto.mjs')
    const source = join(context.directory, 'source')
    const output = join(context.directory, 'existing')
    await writeFile(source, gzipSync(sql))
    await writeFile(output, 'preserve synthetic existing file')
    await assert.rejects(encryptBackupFile({ inputPath: source, outputPath: output, passwordFile: context.passwordFile }))
    assert.equal(await readFile(output, 'utf8'), 'preserve synthetic existing file')
}))

test('decrypt refuses an existing output without deleting it', async () => fixture(async (context) => {
    const { decryptBackupFile } = await import('./backup-crypto.mjs')
    const inputPath = await context.archive(await encrypted(context))
    const outputPath = join(context.directory, 'existing')
    await writeFile(outputPath, 'preserve synthetic existing file')
    await assert.rejects(decryptBackupFile({ inputPath, outputPath, passwordFile: context.passwordFile }))
    assert.equal(await readFile(outputPath, 'utf8'), 'preserve synthetic existing file')
}))
