import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

test('ops harness check passes', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-ops-harness.mjs'])
  assert.match(stdout, /Ops harness controls verified/)
})
