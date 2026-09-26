import { describe, expect, it, vi } from 'vitest'

import { CreateAutoCareChatModeration1786110000000 } from './migrations/1786110000000-CreateAutoCareChatModeration.js'
import { ScopedAutoCareChatModeration1786360000000 } from './migrations/1786360000000-ScopedAutoCareChatModeration.js'
import { RetainChatEvidenceForAppeals1786380000000 } from './migrations/1786380000000-RetainChatEvidenceForAppeals.js'

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

describe('chat evidence retention migration', () => {
    it('adds a bounded retention deadline for appeal evidence', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new RetainChatEvidenceForAppeals1786380000000().up({ query } as never)
        expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
            'ALTER TABLE "autocare_service_messages" ADD COLUMN "evidenceRetainUntil" TIMESTAMP WITH TIME ZONE',
        ])
    })
})

describe('scoped AutoCare chat moderation migration', () => {
    it('adds consent, exact message anchors, expiring moderator grants and safe deletion tombstones', async () => {
        const query = vi.fn().mockResolvedValue(undefined)
        await new ScopedAutoCareChatModeration1786360000000().up({ query } as never)
        const statements = query.mock.calls.map(([sql]) => String(sql))
        expect(statements.some((sql) => sql.includes("ADD VALUE IF NOT EXISTS 'threat'"))).toBe(true)
        expect(statements.some((sql) => sql.includes('"reportedMessageId" uuid'))).toBe(true)
        expect(statements.some((sql) => sql.includes('"acknowledgedAt" TIMESTAMP WITH TIME ZONE'))).toBe(true)
        expect(statements.some((sql) => sql.includes('"accessExpiresAt" TIMESTAMP WITH TIME ZONE'))).toBe(true)
        expect(statements.some((sql) => sql.includes('"extensionUsed" boolean NOT NULL DEFAULT false'))).toBe(true)
        expect(statements.some((sql) => sql.includes('"deletedAt" TIMESTAMP WITH TIME ZONE'))).toBe(true)
        expect(statements.some((sql) => sql.includes('UQ_autocare_chat_reports_thread_reporter_message'))).toBe(true)
        expect(statements.some((sql) => sql.includes('DROP INDEX "public"."UQ_autocare_chat_reports_reporter_thread"'))).toBe(true)
    })
})
