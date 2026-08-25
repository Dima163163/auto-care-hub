import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

test('Bookly runtime check passes', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-no-bookly-runtime.mjs'])
  assert.match(stdout, /No Bookly runtime references/)
})
