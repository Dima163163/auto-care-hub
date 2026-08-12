import { execFileSync } from 'node:child_process'
import { describe, it } from 'node:test'

describe('interaction-state contract', () => {
  it('passes the source-level primitive gate', () => {
    execFileSync(process.execPath, ['scripts/check-interaction-state-contract.mjs'], {
      stdio: 'pipe',
    })
  })
})
