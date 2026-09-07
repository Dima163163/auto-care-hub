import { describe, expect, it } from 'vitest'

import { resolvePilotEvidencePath } from './check-pilot-evidence'

describe('resolvePilotEvidencePath', () => {
    it('resolves the default evidence file from the repository root', () => {
        expect(resolvePilotEvidencePath()).toMatch(/autocare-hub\/docs\/operations\/pilot-evidence\.json$/)
    })

    it('resolves relative configured paths from the repository root', () => {
        expect(resolvePilotEvidencePath('tmp/pilot-evidence.json')).toMatch(/autocare-hub\/tmp\/pilot-evidence\.json$/)
    })

    it('preserves absolute configured paths', () => {
        expect(resolvePilotEvidencePath('/secure/pilot-evidence.json')).toBe('/secure/pilot-evidence.json')
    })
})
