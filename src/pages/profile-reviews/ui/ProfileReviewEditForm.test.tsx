import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProfileReviewEditForm } from './ProfileReviewEditForm'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'ru', t: (key: string) => key }),
}))

describe('ProfileReviewEditForm', () => {
    it('announces an update failure as an accessible alert', () => {
        render(
            <ProfileReviewEditForm
                error="Отзыв уже обновлён."
                isLoading={false}
                rating={5}
                reviewId="review-1"
                text="Хороший сервис"
                onCancel={vi.fn()}
                onRatingChange={vi.fn()}
                onSubmit={vi.fn()}
                onTextChange={vi.fn()}
            />,
        )

        expect(screen.getByRole('alert')).toHaveTextContent('Отзыв уже обновлён.')
    })
})
