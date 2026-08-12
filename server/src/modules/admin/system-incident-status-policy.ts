import { SystemIncidentStatus } from '../../entities/system-incident/system-incident.entity.js'

export function assertSystemIncidentStatusTransition(
    current: SystemIncidentStatus,
    next: SystemIncidentStatus,
) {
    if (current === SystemIncidentStatus.Resolved && next !== SystemIncidentStatus.Resolved) {
        throw new Error('Resolved system incidents cannot be reopened.')
    }
    return next
}
