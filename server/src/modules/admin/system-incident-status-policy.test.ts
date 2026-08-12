import { describe, expect, it } from 'vitest'

import { SystemIncidentStatus } from '../../entities/system-incident/system-incident.entity.js'
import { assertSystemIncidentStatusTransition } from './system-incident-status-policy.js'

describe('system incident status policy', () => {
    it('allows forward and repeated transitions', () => {
        expect(assertSystemIncidentStatusTransition(SystemIncidentStatus.Open, SystemIncidentStatus.Acknowledged))
            .toBe(SystemIncidentStatus.Acknowledged)
        expect(assertSystemIncidentStatusTransition(SystemIncidentStatus.Resolved, SystemIncidentStatus.Resolved))
            .toBe(SystemIncidentStatus.Resolved)
    })

    it('prevents reopening a resolved incident', () => {
        expect(() => assertSystemIncidentStatusTransition(SystemIncidentStatus.Resolved, SystemIncidentStatus.Open))
            .toThrow(/reopened/)
    })
})
