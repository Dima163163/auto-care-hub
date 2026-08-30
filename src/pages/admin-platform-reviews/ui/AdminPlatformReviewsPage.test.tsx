import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminPlatformReviewsPage } from './AdminPlatformReviewsPage'

const mocks = vi.hoisted(() => ({
    respond: vi.fn(),
    remove: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { role: 'super_admin' } }),
}))

vi.mock('@/entities/platform-review', () => ({
    useGetAdminPlatformReviewsQuery: () => ({
        data: [{
            id: 'review-1',
            authorName: 'Alex Driver',
            avatarUrl: null,
            authorRole: 'Клиент',
            rating: 4,
            text: 'Хороший сервис поиска.',
            status: 'pending',
            organizationResponse: null,
            organizationRespondedAt: null,
            createdAt: '2026-08-29T09:00:00.000Z',
        }],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    }),
    useRespondToPlatformReviewMutation: () => [mocks.respond, { isLoading: false }],
    useRemovePlatformReviewMutation: () => [mocks.remove, { isLoading: false, isSuccess: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('AdminPlatformReviewsPage', () => {
    beforeEach(() => {
        mocks.respond.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Ответ не принят сервером.' } }),
        }))
        mocks.remove.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Отзыв уже изменён.' } }),
        }))
    })

    it('surfaces moderation failures without unhandled rejections or losing the draft', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<AdminPlatformReviewsPage />)

            const response = screen.getByRole('textbox', { name: 'Ответ организации' })
            await user.type(response, 'Проверим и вернёмся с ответом.')
            await user.click(screen.getByRole('button', { name: 'Ответить и опубликовать' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Ответ не принят сервером.')
            expect(response).toHaveValue('Проверим и вернёмся с ответом.')
            expect(screen.queryByText('Ответ сохранён')).not.toBeInTheDocument()

            await user.click(screen.getByRole('button', { name: 'Удалить отзыв' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Отзыв уже изменён.')
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
