import { describe, expect, it } from 'vitest'

import type { User } from '@/entities/user'
import { getMockAutoCareChatThreads } from './mock-chat'

describe('mock chat index', () => {
    it('keeps private request threads out of the super-admin list', () => {
        const user = { id: 'synthetic-super-admin', role: 'super_admin' } as User
        const threads = getMockAutoCareChatThreads(user)
        expect(threads.length).toBeGreaterThan(0)
        expect(threads.every((thread) => thread.type === 'support' || thread.type === 'admin_escalation')).toBe(true)
    })
})
