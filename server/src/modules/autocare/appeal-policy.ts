import { AutoCareAppealStatus, AutoCareAppealSubject } from '../../entities/automotive/appeal.entity.js'

export type AppealSubject = AutoCareAppealSubject
export type AppealStatus = AutoCareAppealStatus

export type AppealInput = {
    subject: AppealSubject
    reason: string
    evidenceIds?: readonly string[]
}

export type NormalizedAdminAppealsQuery = {
    status?: AppealStatus
    subject?: AppealSubject
    limit: number
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const appealSubjects = new Set<AppealSubject>(Object.values(AutoCareAppealSubject))
const appealStatuses = new Set<AutoCareAppealStatus>(Object.values(AutoCareAppealStatus))
const appealDecisionStatuses = new Set<AutoCareAppealStatus>([AutoCareAppealStatus.Accepted, AutoCareAppealStatus.Rejected])
const adminAppealQueryKeys = new Set(['cursor', 'limit', 'status', 'subject'])
const appealInputKeys = new Set(['subject', 'subjectId', 'providerId', 'reason', 'evidenceIds'])
const appealDecisionInputKeys = new Set(['status', 'reason'])

export function normalizeAppealUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function validateAppealInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false as const, reason: 'Appeal payload is invalid.' }
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !appealInputKeys.has(key))) return { ok: false as const, reason: 'Appeal payload contains unsupported fields.' }
    if (typeof value.subject !== 'string' || !appealSubjects.has(value.subject as AppealSubject)) return { ok: false as const, reason: 'Appeal subject is invalid.' }
    if (typeof value.reason !== 'string') return { ok: false as const, reason: 'Appeal reason must be 20–4000 characters.' }
    const reason = value.reason.normalize('NFKC').trim()
    if (reason.length < 20 || reason.length > 4_000) return { ok: false as const, reason: 'Appeal reason must be 20–4000 characters.' }
    if (value.evidenceIds !== undefined && !Array.isArray(value.evidenceIds)) return { ok: false as const, reason: 'Appeal evidence references are invalid.' }
    const rawEvidenceIds = value.evidenceIds as unknown[] | undefined
    if (rawEvidenceIds && rawEvidenceIds.length > 20) return { ok: false as const, reason: 'Appeal evidence is limited to 20 items.' }
    const evidenceIds = [...new Set((rawEvidenceIds ?? []).map((id) => normalizeAppealUuid(id)))]
    if (evidenceIds.some((id) => !id)) return { ok: false as const, reason: 'Appeal evidence references are invalid.' }
    return { ok: true as const, value: { subject: value.subject as AppealSubject, reason, evidenceIds: evidenceIds as string[] } }
}

export function validateAppealDecisionInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false as const, reason: 'Appeal decision is invalid.' }
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !appealDecisionInputKeys.has(key))) return { ok: false as const, reason: 'Appeal decision contains unsupported fields.' }
    if (typeof value.status !== 'string' || !appealDecisionStatuses.has(value.status as AutoCareAppealStatus)) return { ok: false as const, reason: 'Appeal decision status is invalid.' }
    if (typeof value.reason !== 'string') return { ok: false as const, reason: 'Appeal decision reason must be 1–2000 characters.' }
    const reason = value.reason.normalize('NFKC').trim()
    if (reason.length < 1 || reason.length > 2_000) return { ok: false as const, reason: 'Appeal decision reason must be 1–2000 characters.' }
    return { ok: true as const, value: { status: value.status as AutoCareAppealStatus.Accepted | AutoCareAppealStatus.Rejected, reason } }
}

/**
 * Admin appeal listing is also called by internal jobs and scripts. Keep the
 * query bounded and enum-backed after the HTTP layer so a direct caller cannot
 * widen the database scan or inject an arbitrary status/subject condition.
 * `cursor` remains accepted for route compatibility until the list endpoint
 * itself becomes cursor-based; the current response contract is still an
 * array and therefore deliberately ignores it.
 */
export function normalizeAdminAutoCareAppealsQuery(input: unknown): NormalizedAdminAppealsQuery | null {
    if (input === undefined || input === null) return { limit: 50 }
    if (typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !adminAppealQueryKeys.has(key))) return null
    if (value.cursor !== undefined && (typeof value.cursor !== 'string' || value.cursor.trim().length > 512)) return null
    if (value.status !== undefined && (typeof value.status !== 'string' || !appealStatuses.has(value.status as AppealStatus))) return null
    if (value.subject !== undefined && (typeof value.subject !== 'string' || !appealSubjects.has(value.subject as AppealSubject))) return null
    if (value.limit !== undefined && (typeof value.limit !== 'number' || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 100)) return null
    return {
        ...(value.status !== undefined ? { status: value.status as AppealStatus } : {}),
        ...(value.subject !== undefined ? { subject: value.subject as AppealSubject } : {}),
        limit: value.limit === undefined ? 50 : value.limit,
    }
}

export function canTransitionAppeal(status: AppealStatus, next: AppealStatus) {
    if (status === 'pending') return next === 'accepted' || next === 'rejected' || next === 'withdrawn'
    return false
}

/**
 * PostgreSQL uses 23505 for unique-index conflicts. Keeping this guard
 * deliberately narrow lets callers recover only the duplicate they can
 * safely reconcile, while rethrowing every other persistence failure.
 */
export function isPostgresUniqueViolation(error: unknown) {
    return Boolean(
        error
        && typeof error === 'object'
        && 'code' in error
        && (error as { code?: unknown }).code === '23505',
    )
}
