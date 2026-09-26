const STORAGE_KEY = 'autocarehub:mock:chat-report-demo-1:assignment:v1'
const MAX_ASSIGNMENT_AGE_MS = 14 * 24 * 60 * 60 * 1000
const MAX_FUTURE_EXPIRY_MS = 49 * 60 * 60 * 1000

type AssignmentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type MockChatReportAssignmentState = {
    moderatorId: string
    accessExpiresAt: string
    extensionUsed: boolean
}

type PersistableMockChatReport = {
    id: string
    assignedModeratorId: string | null
    accessExpiresAt: string | null
    extensionUsed: boolean
}

function getBrowserStorage(): AssignmentStorage | null {
    if (typeof window === 'undefined') return null

    try {
        return window.localStorage
    } catch {
        return null
    }
}

export function readMockChatReportAssignment(
    storage: AssignmentStorage | null = getBrowserStorage(),
    now = Date.now(),
): MockChatReportAssignmentState | null {
    if (!storage) return null

    try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw) return null

        const value: unknown = JSON.parse(raw)
        if (!value || typeof value !== 'object') return null

        const record = value as Record<string, unknown>
        if (record.version !== 1
            || typeof record.moderatorId !== 'string'
            || !record.moderatorId
            || typeof record.accessExpiresAt !== 'string'
            || typeof record.extensionUsed !== 'boolean') return null

        const expiry = Date.parse(record.accessExpiresAt)
        if (!Number.isFinite(expiry)
            || expiry > now + MAX_FUTURE_EXPIRY_MS
            || expiry < now - MAX_ASSIGNMENT_AGE_MS) {
            storage.removeItem(STORAGE_KEY)
            return null
        }

        return {
            moderatorId: record.moderatorId,
            accessExpiresAt: new Date(expiry).toISOString(),
            extensionUsed: record.extensionUsed,
        }
    } catch {
        return null
    }
}

export function persistMockChatReportAssignment(
    report: PersistableMockChatReport,
    storage: AssignmentStorage | null = getBrowserStorage(),
): void {
    if (!storage || report.id !== 'chat-report-demo-1') return

    try {
        if (!report.assignedModeratorId || !report.accessExpiresAt) {
            storage.removeItem(STORAGE_KEY)
            return
        }

        storage.setItem(STORAGE_KEY, JSON.stringify({
            version: 1,
            moderatorId: report.assignedModeratorId,
            accessExpiresAt: report.accessExpiresAt,
            extensionUsed: report.extensionUsed,
        }))
    } catch {
        // Mock assignment persistence is best-effort; API behavior still works in memory.
    }
}

export function clearMockChatReportAssignment(
    reportId: string,
    storage: AssignmentStorage | null = getBrowserStorage(),
): void {
    if (!storage || reportId !== 'chat-report-demo-1') return

    try {
        storage.removeItem(STORAGE_KEY)
    } catch {
        // Storage may be unavailable in privacy-restricted browsing contexts.
    }
}
