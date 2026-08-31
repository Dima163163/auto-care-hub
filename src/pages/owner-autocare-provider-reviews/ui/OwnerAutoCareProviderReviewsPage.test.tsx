import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ReviewResolutionDialog } from './OwnerAutoCareProviderReviewsPage'

const issuePromo = vi.hoisted(() => vi.fn())

vi.mock('@/entities/automotive-service', () => ({
    useIssueOwnerAutoCareReviewPromoMutation: () => [issuePromo, { isLoading: false }],
}))

describe('ReviewResolutionDialog', () => {
    beforeEach(() => {
        issuePromo.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Промокоды временно недоступны.' } }),
        }))
    })

    it('keeps the discount form and exposes a retryable error when issuing fails', async () => {
        const user = userEvent.setup()
        const unhandled: unknown[] = []
        const onUnhandled = (reason: unknown) => unhandled.push(reason)
        process.on('unhandledRejection', onUnhandled)

        try {
            render(
                <ReviewResolutionDialog
                    providerId="provider-1"
                    review={{ id: 'review-1', providerId: 'provider-1', authorName: 'Клиент', vehicleLabel: 'Toyota', rating: 4, text: 'Хорошо', avatarUrl: null, photoUrls: [], createdAt: '2026-08-30T10:00:00.000Z', serviceRequestId: 'request-1' }}
                    copy={{ issueDiscount: 'Предложить скидку', promoNote: 'Описание', promoError: 'Не удалось выпустить промокод.', promoCreated: 'Промокод выпущен', copyError: 'Не удалось скопировать промокод.', copyCode: 'Скопировать код', discountPercent: 'Скидка, %', expiresInDays: 'Срок, дней', issue: 'Выпустить промокод', cancel: 'Отмена', close: 'Готово' }}
                />,
            )

            await user.click(screen.getByRole('button', { name: 'Предложить скидку' }))
            const discount = screen.getByRole('spinbutton', { name: 'Скидка, %' })
            await user.clear(discount)
            await user.type(discount, '15')
            await user.click(screen.getByRole('button', { name: 'Выпустить промокод' }))

            expect(await screen.findByRole('alert')).toHaveTextContent('Промокоды временно недоступны.')
            expect(discount).toHaveValue(15)
            expect(unhandled).toEqual([])
        } finally {
            process.off('unhandledRejection', onUnhandled)
        }
    })
})
