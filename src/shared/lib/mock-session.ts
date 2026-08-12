import type { UserRole } from '@/entities/user'

import {
    MOCK_SESSION_STORAGE_KEY,
    clearMockSessionStorage,
} from './mock-session-storage'

type MockSession = {
    currentUserId: string | null
    currentRole: UserRole | null
}

const DEFAULT_MOCK_SESSION: MockSession = {
    currentUserId: null,
    currentRole: null,
}

function isUserRole(value: unknown): value is UserRole {
    return (
        value === 'client' ||
        value === 'owner' ||
        value === 'admin' ||
        value === 'super_admin'
    )
}

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readMockSession(): MockSession {
    if (!canUseStorage()) {
        return { ...DEFAULT_MOCK_SESSION }
    }

    try {
        const rawSession = window.localStorage.getItem(MOCK_SESSION_STORAGE_KEY)

        if (!rawSession) {
            return { ...DEFAULT_MOCK_SESSION }
        }

        const parsedSession = JSON.parse(rawSession) as Partial<MockSession>

        return {
            currentUserId:
                typeof parsedSession.currentUserId === 'string'
                    ? parsedSession.currentUserId
                    : null,
            currentRole: isUserRole(parsedSession.currentRole)
                ? parsedSession.currentRole
                : null,
        }
    } catch {
        return { ...DEFAULT_MOCK_SESSION }
    }
}

function writeMockSession(session: MockSession) {
    if (!canUseStorage()) {
        return
    }

    window.localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export const mockSession: MockSession = readMockSession()

export function setMockSession(session: MockSession) {
    mockSession.currentUserId = session.currentUserId
    mockSession.currentRole = session.currentRole

    writeMockSession(mockSession)
}

export function clearMockSession() {
    setMockSession(DEFAULT_MOCK_SESSION)
    clearMockSessionStorage()
}
