import { describe, expect, it } from 'vitest'

import {
    clearMockChatReportAssignment,
    persistMockChatReportAssignment,
    readMockChatReportAssignment,
} from './mock-chat-report-assignment'

function createMemoryStorage() {
    const entries = new Map<string, string>()

    return {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => entries.set(key, value),
        removeItem: (key: string) => entries.delete(key),
    }
}

describe('mock demo chat report assignment persistence', () => {
    it('restores a valid time-limited assignment after a module reload', () => {
        const storage = createMemoryStorage()
        const now = Date.parse('2026-09-26T14:00:00.000Z')

        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-27T14:00:00.000Z',
            extensionUsed: false,
        }, storage)

        expect(readMockChatReportAssignment(storage, now)).toEqual({
            moderatorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-27T14:00:00.000Z',
            extensionUsed: false,
        })
    })

    it('does not restore expired or unreasonably long assignments', () => {
        const storage = createMemoryStorage()
        const now = Date.parse('2026-09-26T14:00:00.000Z')

        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-26T13:00:00.000Z',
            extensionUsed: false,
        }, storage)
        expect(readMockChatReportAssignment(storage, now)).toEqual({
            moderatorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-26T13:00:00.000Z',
            extensionUsed: false,
        })
        expect(readMockChatReportAssignment(storage, now + 15 * 24 * 60 * 60 * 1000)).toBeNull()

        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-10-01T14:00:00.000Z',
            extensionUsed: false,
        }, storage)
        expect(readMockChatReportAssignment(storage, now)).toBeNull()
    })

    it('clears the persistent permit on unassignment or final decision', () => {
        const storage = createMemoryStorage()
        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-27T14:00:00.000Z',
            extensionUsed: false,
        }, storage)

        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: null,
            accessExpiresAt: null,
            extensionUsed: false,
        }, storage)
        expect(readMockChatReportAssignment(storage)).toBeNull()

        persistMockChatReportAssignment({
            id: 'chat-report-demo-1',
            assignedModeratorId: 'user-admin-moderator-1',
            accessExpiresAt: '2026-09-27T14:00:00.000Z',
            extensionUsed: false,
        }, storage)
        clearMockChatReportAssignment('chat-report-demo-1', storage)
        expect(readMockChatReportAssignment(storage)).toBeNull()
    })
})
