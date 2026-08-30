import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const gzipAsync = promisify(gzip)

test('ops harness check passes', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-ops-harness.mjs'])
  assert.match(stdout, /Ops harness controls verified/)
})

test('restore verifies a portable checksum before invoking the database client', async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'autocarehub-backup-'))
  try {
    const archivePath = resolve(fixtureRoot, 'portable.sql.gz')
    const checksumPath = `${archivePath}.sha256`
    await writeFile(archivePath, await gzipAsync(Buffer.from('-- restore fixture\n')))
    const { stdout: checksum } = await execFileAsync('shasum', ['-a', '256', 'portable.sql.gz'], { cwd: fixtureRoot })
    await writeFile(checksumPath, checksum)

    const fakeBin = resolve(fixtureRoot, 'bin')
    await mkdir(fakeBin)
    const fakePsql = resolve(fakeBin, 'psql')
    await writeFile(fakePsql, '#!/bin/sh\ncat >/dev/null\nexit 0\n')
    await chmod(fakePsql, 0o700)

    const { stdout } = await execFileAsync('bash', [
      resolve('server/scripts/restore.sh'),
      archivePath,
      'restore_target',
    ], {
      cwd: resolve('.'),
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        ALLOW_UNENCRYPTED_LOCAL_RESTORE: 'true',
        DATABASE_NAME: 'production_database',
      },
    })
    assert.match(stdout, /Restore completed successfully/)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test('backup writes unique archives with checksums portable outside the source directory', async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'autocarehub-backup-source-'))
  const copyRoot = await mkdtemp(resolve(tmpdir(), 'autocarehub-backup-copy-'))
  try {
    const fakeBin = resolve(fixtureRoot, 'bin')
    await mkdir(fakeBin)
    const fakePgDump = resolve(fakeBin, 'pg_dump')
    await writeFile(fakePgDump, '#!/bin/sh\nprintf \'%s\\n\' \'-- backup fixture\'\n')
    await chmod(fakePgDump, 0o700)
    const environment = {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
      BACKUP_DIR: fixtureRoot,
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: '5433',
      DATABASE_NAME: 'autocarehub',
      DATABASE_USER: 'autocarehub',
      DATABASE_PASSWORD: 'fixture-password',
      ALLOW_UNENCRYPTED_LOCAL_BACKUP: 'true',
    }
    delete environment.BACKUP_ENCRYPTION_PASSWORD_FILE

    const runBackup = async () => execFileAsync('bash', [resolve('server/scripts/backup.sh')], {
      cwd: resolve('.'),
      env: environment,
    })
    const first = await runBackup()
    const second = await runBackup()
    const firstPath = first.stdout.match(/Backup successful: (.+)\n/)?.[1]
    const secondPath = second.stdout.match(/Backup successful: (.+)\n/)?.[1]
    assert.ok(firstPath)
    assert.ok(secondPath)
    assert.notEqual(firstPath, secondPath)

    const checksum = await readFile(`${firstPath}.sha256`, 'utf8')
    const firstBasename = firstPath.split('/').pop()
    assert.match(checksum, new RegExp(`\\s${firstBasename}\\s*$`))
    const copiedArchive = resolve(copyRoot, firstBasename)
    const copiedChecksum = `${copiedArchive}.sha256`
    await copyFile(firstPath, copiedArchive)
    await copyFile(`${firstPath}.sha256`, copiedChecksum)
    const verified = await execFileAsync('shasum', ['-a', '256', '-c', `${copiedArchive.split('/').pop()}.sha256`], { cwd: copyRoot })
    assert.match(verified.stdout, /OK/)
  } finally {
    await Promise.all([
      rm(fixtureRoot, { recursive: true, force: true }),
      rm(copyRoot, { recursive: true, force: true }),
    ])
  }
})
