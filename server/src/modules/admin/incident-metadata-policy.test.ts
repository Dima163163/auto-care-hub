import { describe, expect, it } from 'vitest'

import {
    assertIncidentMetadataKeyCount,
    MAX_INCIDENT_METADATA_KEYS,
} from './incident-metadata-policy.js'

describe('incident metadata key policy', () => {
    it('accepts bounded metadata', () => {
        expect(assertIncidentMetadataKeyCount({ reason: 'timeout' })).toEqual({ reason: 'timeout' })
    })

    it('rejects excessive metadata keys', () => {
        expect(() => assertIncidentMetadataKeyCount(Object.fromEntries(
            Array.from({ length: MAX_INCIDENT_METADATA_KEYS + 1 }, (_, index) => [`key${index}`, index]),
        ))).toThrow(/keys/)
    })
})
