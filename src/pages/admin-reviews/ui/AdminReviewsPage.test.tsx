import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminReviewsPage } from './AdminReviewsPage'

const mocks = vi.hoisted(() => ({
    update: vi.fn(),
}))

vi.mock('@/entities/automotive-service', () => ({
    useGetAdminAutoCareReviewsQuery: () => ({
        data: [{
            id: 'review-1',
            providerId: 'provider-1',
            providerName: 'ProService',
            authorName: 'Алексей С.',
            vehicleLabel: 'BMW X5',
            rating: 5,
            text: 'Быстро приняли машину и прислали понятный фотоотчёт.',
            avatarUrl: null,
            photoUrls: [],
            createdAt: '2026-08-12T10:00:00.000Z',
            status: 'approved',
        }],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    }),
    useUpdateAdminAutoCareReviewStatusMutation: () => [mocks.update, { isLoading: false }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

describe('AdminReviewsPage', () => {
    beforeEach(() => {
        mocks.update.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
    })

    it('lets an administrator block a review with an auditable reason', async () => {
        const user = userEvent.setup()
        render(<AdminReviewsPage />)

        await user.click(screen.getByRole('button', { name: 'Заблокировать' }))
        await user.selectOptions(screen.getByRole('combobox', { name: 'Причина блокировки' }), 'profanity')
        await user.click(screen.getByRole('button', { name: 'Заблокировать отзыв' }))

        expect(mocks.update).toHaveBeenCalledWith({
            reviewId: 'review-1',
            status: 'rejected',
            reason: 'Нецензурная лексика',
        })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not submit a block without a reason', async () => {
        const user = userEvent.setup()
        render(<AdminReviewsPage />)

        await user.click(screen.getByRole('button', { name: 'Заблокировать' }))
        await user.click(screen.getByRole('button', { name: 'Заблокировать отзыв' }))

        expect(screen.getByRole('alert')).toHaveTextContent('Выберите причину блокировки.')
        expect(mocks.update).not.toHaveBeenCalled()
    })
})
