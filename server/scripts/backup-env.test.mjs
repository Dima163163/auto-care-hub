import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseBackupEnvironment } from './backup-env.mjs'

test('dotenv preserves quoted spaces, comments, newlines and empty values', () => {
    const result = parseBackupEnvironment('DATABASE_PASSWORD="synthetic password # literal" # comment\nBACKUP_DIR="/tmp/backup dir"\nDATABASE_HOST=localhost # comment\nDATABASE_USER=\nBACKUP_ENCRYPTION_PASSWORD_FILE="/tmp/key\\nfile"', {})
    assert.equal(result.DATABASE_PASSWORD, 'synthetic password # literal')
    assert.equal(result.BACKUP_DIR, '/tmp/backup dir')
    assert.equal(result.DATABASE_HOST, 'localhost')
    assert.equal(result.DATABASE_USER, '')
    assert.equal(result.BACKUP_ENCRYPTION_PASSWORD_FILE, '/tmp/key\nfile')
})

test('explicit process values, including empty values and production, take precedence', () => {
    const result = parseBackupEnvironment('NODE_ENV=development\nDATABASE_PASSWORD=replacement', { NODE_ENV: 'production', DATABASE_PASSWORD: '' })
    assert.equal(result.NODE_ENV, 'production')
    assert.equal(result.DATABASE_PASSWORD, '')
})

test('only backup configuration is loaded; shell expressions remain inert strings', () => {
    const result = parseBackupEnvironment('PATH=/malicious\nNODE_OPTIONS=--require=/malicious\nDATABASE_PASSWORD="$(touch /tmp/do-not-create) `id` $HOME"', {})
    assert.equal(result.PATH, undefined)
    assert.equal(result.NODE_OPTIONS, undefined)
    assert.equal(result.DATABASE_PASSWORD, '$(touch /tmp/do-not-create) `id` $HOME')
    assert.equal(result.AUTOCARE_BACKUP_ENV_LOADED, 'true')
})
