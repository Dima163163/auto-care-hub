import { AppDataSource } from '../../database/data-source.js'
import { ServiceMessageEntity } from '../../entities/index.js'
import { getFirstProviderResponseMinutes } from './first-provider-response-policy.js'

const MESSAGE_PAGE_SIZE = 1_000

type Provider = { id: string; ownerId?: string | null }
type Membership = { providerId: string; userId: string; locationId: string | null; status: string }
type Request = { id: string; providerId: string; locationId: string; clientId: string; createdAt: Date }

/** Scan metadata only; the result keeps one number per answered request. */
export async function readFirstProviderResponseMinutes(input: {
    providers: readonly Provider[]
    memberships: readonly Membership[]
    requests: readonly Request[]
}) {
    if (input.requests.length === 0) return new Map<string, number>()
    const requestIds = input.requests.map((request) => request.id)
    const firstResponseMinutes = new Map<string, number>()
    let cursor: { createdAt: Date; id: string } | null = null
    while (true) {
        const query = AppDataSource.getRepository(ServiceMessageEntity).createQueryBuilder('message')
            .select(['message.id', 'message.requestId', 'message.senderId', 'message.kind', 'message.createdAt'])
            .where('message.requestId IN (:...requestIds)', { requestIds })
        if (cursor) query.andWhere('(message.createdAt > :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id > :cursorId))', {
            cursorCreatedAt: cursor.createdAt, cursorId: cursor.id,
        })
        const rows = await query.orderBy('message.createdAt', 'ASC').addOrderBy('message.id', 'ASC')
            .take(MESSAGE_PAGE_SIZE + 1).getMany()
        const page = rows.slice(0, MESSAGE_PAGE_SIZE)
        const pageFirst = getFirstProviderResponseMinutes({ ...input, messages: page })
        for (const [requestId, minutes] of pageFirst) {
            const previous = firstResponseMinutes.get(requestId)
            if (previous === undefined || minutes < previous) firstResponseMinutes.set(requestId, minutes)
        }
        if (rows.length <= MESSAGE_PAGE_SIZE) return firstResponseMinutes
        const last = page.at(-1)!
        cursor = { createdAt: last.createdAt, id: last.id }
    }
}
