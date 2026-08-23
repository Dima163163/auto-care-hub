import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareChatModeration1786110000000 } from './migrations/1786110000000-CreateAutoCareChatModeration.js'

describe('AutoCare chat moderation migration', () => {
    it('keeps report metadata separate from private message bodies and supports scoped blocks', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new CreateAutoCareChatModeration1786110000000().up({ query } as never)
        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes('autocare_chat_reports'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_chat_reports_reporter_thread'))).toBe(true)
        expect(statements.some((sql) => sql.includes('autocare_chat_blocks'))).toBe(true)
        expect(statements.some((sql) => sql.includes('CHK_autocare_chat_blocks_distinct_users'))).toBe(true)
    })
})
