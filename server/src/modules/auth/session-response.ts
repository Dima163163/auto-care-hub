import type { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'

export type PublicSession = {
    id: string
    userAgent: string | null
    ipAddress: string | null
    lastActiveAt: string
    isCurrent: boolean
}

export function toPublicSession(session: UserSessionEntity, currentSessionId: string | null): PublicSession {
    return {
        id: session.id,
        userAgent: session.userAgent?.trim() || null,
        ipAddress: session.ipAddress?.trim() || null,
        lastActiveAt: session.lastActiveAt.toISOString(),
        isCurrent: session.id === currentSessionId,
    }
}
