export type AppealSubject = 'provider' | 'review' | 'suspension' | 'catalog'
export type AppealStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export type AppealInput = {
    subject: AppealSubject
    reason: string
    evidenceIds?: readonly string[]
}

export function validateAppealInput(input: AppealInput) {
    const reason = input.reason.trim()
    if (reason.length < 20 || reason.length > 4_000) return { ok: false as const, reason: 'Appeal reason must be 20–4000 characters.' }
    const evidenceIds = [...new Set(input.evidenceIds ?? [])].filter((id) => id.length > 0).slice(0, 20)
    return { ok: true as const, value: { subject: input.subject, reason, evidenceIds } }
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
