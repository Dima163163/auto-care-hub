import { afterEach, describe, expect, it } from 'vitest'

import {
    clearMockSession,
    mockSession,
    setMockSession,
} from './mock-session'
import { MOCK_SESSION_STORAGE_KEY } from './mock-session-storage'

describe('mock session cleanup', () => {
    afterEach(() => {
        clearMockSession()
    })

    it('clears both the in-memory identity and persisted session', () => {
        setMockSession({
            currentUserId: 'user-client-1',
            currentRole: 'client',
        })

        clearMockSession()

        expect(mockSession).toEqual({
            currentUserId: null,
            currentRole: null,
        })
        expect(window.localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).toBeNull()
    })
})
