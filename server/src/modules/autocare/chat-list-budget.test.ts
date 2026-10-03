import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getRepository: vi.fn(), scopes: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
vi.mock('./provider-access.service.js', () => ({ getManagedProviderPermissionScopes: mocks.scopes, hasProviderWorkspacePermission: vi.fn(), isManagedProviderLocationAllowed: vi.fn() }))
import { AutoCareChatThreadEntity, AutoCareChatThreadType, AutoCareChatThreadStatus, AutoCareChatBlockEntity, ServiceMessageEntity, AutomotiveProviderEntity } from '../../entities/index.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { getMyAutoCareChats } from './autocare-chat.service.js'

function chain() {
    const query = { leftJoin: vi.fn(), innerJoin: vi.fn(), select: vi.fn(), addSelect: vi.fn(), distinctOn: vi.fn(), where: vi.fn(), andWhere: vi.fn(), orderBy: vi.fn(), addOrderBy: vi.fn(), groupBy: vi.fn(), take: vi.fn(), getMany: vi.fn().mockResolvedValue([]), getRawMany: vi.fn().mockResolvedValue([]) }
    for (const method of [query.leftJoin, query.innerJoin, query.select, query.addSelect, query.distinctOn, query.where, query.andWhere, query.orderBy, query.addOrderBy, query.groupBy, query.take]) method.mockReturnValue(query)
    return query
}
describe('bounded chat list summaries', () => {
    beforeEach(() => { mocks.getRepository.mockReset(); mocks.scopes.mockResolvedValue([]) })
    function setup(role = UserRole.Client) {
        const user = Object.assign(new UserEntity(), { id: 'synthetic-user', role })
        const threadQuery = chain(), messageQuery = chain(), blockQuery = chain()
        const messageFind = vi.fn()
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === AutoCareChatThreadEntity) return { createQueryBuilder: () => threadQuery }
            if (entity === ServiceMessageEntity) return { createQueryBuilder: () => messageQuery, find: messageFind }
            if (entity === AutoCareChatBlockEntity) return { createQueryBuilder: () => blockQuery }
            if (entity === AutomotiveProviderEntity) return { find: vi.fn().mockResolvedValue([]) }
            throw new Error('Unexpected repository')
        })
        const threads = Array.from({ length: 101 }, (_, index) => Object.assign(new AutoCareChatThreadEntity(), { id: `thread-${index}`, providerId: null, type: AutoCareChatThreadType.Support, status: AutoCareChatThreadStatus.Open, subject: 'Synthetic', clientId: user.id, requestId: null, createdAt: new Date(), updatedAt: new Date() }))
        threadQuery.getMany.mockResolvedValue(threads)
        messageQuery.getRawMany.mockResolvedValue([{ threadId: 'thread-0', count: '10000' }])
        return { user, threadQuery, messageQuery, messageFind, threads }
    }
    it('counts 10000 unread messages without loading/decrypting bodies and limits legacy lists to 100 threads', async () => {
        const { user, threadQuery, messageQuery, messageFind } = setup()
        const result = await getMyAutoCareChats(user)
        expect(Array.isArray(result) && result.length).toBe(100)
        expect(Array.isArray(result) && result[0]?.unreadCount).toBe(10000)
        expect(threadQuery.take).toHaveBeenCalledWith(101)
        expect(messageQuery.getRawMany).toHaveBeenCalledOnce()
        expect(messageQuery.select).toHaveBeenCalledWith('thread.id', 'threadId')
        expect(messageFind).not.toHaveBeenCalled()
    })
    it('returns an explicit cursor page and limits summary loading to its selected threads', async () => {
        const { user, threadQuery, messageQuery } = setup()
        const result = await getMyAutoCareChats(user, { limit: 2 })
        expect(result).toMatchObject({ items: [expect.anything(), expect.anything()], nextCursor: expect.any(String) })
        expect(threadQuery.take).toHaveBeenCalledWith(3)
        expect(messageQuery.where).toHaveBeenCalledWith('thread.id IN (:...ids)', { ids: ['thread-0', 'thread-1'] })
    })
    it('puts provider branch permissions before the SQL limit and rejects unsupported pagination', async () => {
        const { user, threadQuery } = setup(UserRole.Owner)
        mocks.scopes.mockResolvedValue([{ providerId: 'provider-1', locationIds: ['branch-1'] }])
        await getMyAutoCareChats(user, { limit: 2 })
        expect(threadQuery.where).toHaveBeenCalledWith(expect.stringContaining('request.locationId IN (:...locations0)'), expect.objectContaining({ provider0: 'provider-1', locations0: ['branch-1'] }))
        await expect(getMyAutoCareChats(user, { beforeCursor: 'invalid' })).rejects.toMatchObject({ statusCode: 422 })
    })
})
