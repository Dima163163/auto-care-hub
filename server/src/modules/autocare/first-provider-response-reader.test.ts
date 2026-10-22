import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))

import { ServiceMessageEntity } from '../../entities/index.js'
import { readFirstProviderResponseMinutes } from './first-provider-response-reader.js'

function query(rows: unknown[]) {
    const value = { select: vi.fn(), where: vi.fn(), andWhere: vi.fn(), orderBy: vi.fn(), addOrderBy: vi.fn(), take: vi.fn(), getMany: vi.fn().mockResolvedValue(rows) }
    for (const method of [value.select, value.where, value.andWhere, value.orderBy, value.addOrderBy, value.take]) method.mockReturnValue(value)
    return value
}

describe('first provider response history reader', () => {
    it('reads bounded message metadata pages and finds an eligible reply after 1000 system messages', async () => {
        const createdAt = new Date('2026-10-22T10:00:00Z')
        const systemMessages = Array.from({ length: 1000 }, (_, index) => ({
            id: `message-${index}`, requestId: 'request-1', senderId: 'system', kind: 'system',
            createdAt: new Date(createdAt.getTime() + index * 1000),
        }))
        const valid = { id: 'message-1000', requestId: 'request-1', senderId: 'owner-1', kind: 'text', createdAt: new Date(createdAt.getTime() + 20 * 60_000) }
        const queries: ReturnType<typeof query>[] = []
        mocks.getRepository.mockImplementation((entity: unknown) => {
            expect(entity).toBe(ServiceMessageEntity)
            return { createQueryBuilder: () => {
                const builder = query(queries.length === 0 ? [...systemMessages, valid] : [valid])
                queries.push(builder)
                return builder
            } }
        })
        const result = await readFirstProviderResponseMinutes({
            providers: [{ id: 'provider-1', ownerId: 'owner-1' }], memberships: [],
            requests: [{ id: 'request-1', providerId: 'provider-1', locationId: 'branch-1', clientId: 'client-1', createdAt }],
        })

        expect(result.get('request-1')).toBe(20)
        expect(queries).toHaveLength(2)
        expect(queries[0]!.take).toHaveBeenCalledWith(1001)
        expect(queries[1]!.andWhere).toHaveBeenCalledWith(expect.stringContaining('message.createdAt > :cursorCreatedAt'), expect.any(Object))
        expect(queries[0]!.select).toHaveBeenCalledWith(expect.not.arrayContaining(['message.body', 'message.offer']))
    })
})
