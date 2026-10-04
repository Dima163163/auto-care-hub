import { HttpResponse } from "msw"
import type { User } from "@/entities/user"
import { mockAutoCareAppeals, mockAutoCareChatBlocks } from './mock-fixtures'
import type { MockAutoCareChatThread } from './mock-fixtures'

export function invalidMockBodyResponse() {
    return HttpResponse.json(
        { code: 'INVALID_REQUEST_BODY', message: 'Invalid request body.' },
        { status: 400 },
    )
}

export function parseMockOffset(cursor: string | null) {
    if (!cursor?.startsWith('offset:')) return 0
    const offset = Number(cursor.slice('offset:'.length))
    return Number.isSafeInteger(offset) && offset > 0 ? offset : 0
}

export function getMockModerationRestriction(thread: MockAutoCareChatThread, user: User) {
    const sanction = mockAutoCareChatBlocks
        .filter((block) => block.threadId === thread.id
            && block.blockedUserId === user.id
            && block.status === 'active'
            && block.sourceReportId
            && block.expiresAt
            && block.reason)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
    if (!sanction?.sourceReportId || !sanction.expiresAt || !sanction.reason) return null
    const pendingAppeal = mockAutoCareAppeals.find((appeal) => appeal.subject === 'chat_restriction'
        && appeal.subjectId === sanction.id
        && appeal.submittedById === user.id
        && appeal.status === 'pending')
    return {
        id: sanction.id,
        reason: sanction.reason,
        expiresAt: sanction.expiresAt,
        state: Date.parse(sanction.expiresAt) > Date.now() ? 'active' as const : 'expired' as const,
        appealStatus: pendingAppeal?.status ?? null,
    }
}
