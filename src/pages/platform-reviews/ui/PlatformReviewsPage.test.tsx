import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PlatformReviewsPage } from './PlatformReviewsPage'

const mocks = vi.hoisted(() => ({
    createReview: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { role: 'client' } }),
}))

vi.mock('@/entities/platform-review', () => ({
    useGetPlatformReviewsQuery: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    }),
    useCreatePlatformReviewMutation: () => [mocks.createReview, { isLoading: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('PlatformReviewsPage', () => {
    beforeEach(() => {
        mocks.createReview.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Сервис отзывов временно недоступен.' } }),
        }))
    })

    it('keeps a rejected review draft and exposes a retryable error', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(<PlatformReviewsPage />)

            const text = screen.getByRole('textbox', { name: 'Ваш отзыв' })
            await user.type(text, 'Поддержка быстро помогла с записью.')
            await user.click(screen.getByRole('button', { name: 'Отправить на проверку' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Сервис отзывов временно недоступен.')
            expect(text).toHaveValue('Поддержка быстро помогла с записью.')
            expect(screen.queryByText('Спасибо! Отзыв отправлен на модерацию.')).not.toBeInTheDocument()
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
