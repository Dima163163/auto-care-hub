import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { listNotifications, markNotificationAsRead } from './notifications.service.js'

describe('notification service input boundaries', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
    })

    it('rejects malformed notification identifiers before repository lookup', async () => {
        const user = { id: 'user-1', role: 'client', locale: 'en' } as never
        await expect(markNotificationAsRead(user, 'notification-1')).rejects.toMatchObject({ statusCode: 422 })
        await expect(markNotificationAsRead(user, null as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('rejects malformed notification queries before repository lookup', async () => {
        const user = { id: 'user-1', role: 'client', locale: 'en' } as never
        await expect(listNotifications(user, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(listNotifications(user, { cursor: 42 } as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(listNotifications(user, { category: 'unknown' } as never)).rejects.toMatchObject({ statusCode: 422 })
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
