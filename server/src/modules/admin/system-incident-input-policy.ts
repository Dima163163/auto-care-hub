import {
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const incidentTypes = new Set<SystemIncidentType>(Object.values(SystemIncidentType))
const incidentSeverities = new Set<SystemIncidentSeverity>(Object.values(SystemIncidentSeverity))
const incidentStatuses = new Set<SystemIncidentStatus>(Object.values(SystemIncidentStatus))
const recordKeys = new Set(['type', 'severity', 'title', 'requestId', 'metadata'])

function isRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function normalizeEnum<T extends string>(value: unknown, values: Set<T>) {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase() as T
    return values.has(normalized) ? normalized : null
}

export function normalizeSystemIncidentUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeSystemIncidentStatus(value: unknown): SystemIncidentStatus | null {
    return normalizeEnum(value, incidentStatuses)
}

export function normalizeSystemIncidentRecordInput(input: unknown) {
    if (!isRecord(input) || Object.keys(input).some((key) => !recordKeys.has(key))) return null
    const type = normalizeEnum(input.type, incidentTypes)
    const severity = normalizeEnum(input.severity, incidentSeverities)
    if (!type || !severity || typeof input.title !== 'string') return null
    const title = input.title.normalize('NFKC').trim()
    if (!title || title.length > 240) return null

    let requestId: string | undefined
    if (input.requestId !== undefined) {
        if (typeof input.requestId !== 'string') return null
        requestId = input.requestId.normalize('NFKC').trim().slice(0, 128) || undefined
    }

    if (input.metadata !== undefined && !isRecord(input.metadata)) return null
    return {
        type,
        severity,
        title,
        ...(requestId ? { requestId } : {}),
        ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    }
}
