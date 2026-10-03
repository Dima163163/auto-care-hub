import { describe, expect, it } from 'vitest'
import { globSync } from 'node:fs'
import { DATABASE_FIXTURE_TESTS, classifyTestProfile } from './test-profile-policy.js'

describe('automatic backend test profiles', () => {
    it('discovers new pure/schema/service-boundary tests by default', () => {
        for (const path of ['src/config/new-policy.test.ts', 'src/modules/oauth/new-schema.spec.ts', 'src/modules/users/new-boundary.test.ts']) expect(classifyTestProfile(path)).toBe('unit')
    })
    it('keeps integration fixtures explicit and classified', () => {
        expect(classifyTestProfile('src/modules/new/flow.integration.test.ts')).toBe('integration')
        for (const [path, reason] of Object.entries(DATABASE_FIXTURE_TESTS)) {
            expect(reason.length).toBeGreaterThan(10)
            expect([...globSync(path)]).toEqual([path])
            expect(classifyTestProfile(path)).toBe('integration')
        }
    })
})
