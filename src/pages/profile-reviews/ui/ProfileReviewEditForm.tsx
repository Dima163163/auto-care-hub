import type { FormEvent } from 'react'

import { RatingStars } from '@/entities/review'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type ProfileReviewEditFormProps = {
    error: string | null
    isLoading: boolean
    rating: number
    reviewId: string
    text: string
    onCancel: () => void
    onRatingChange: (value: number) => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
    onTextChange: (value: string) => void
}

export function ProfileReviewEditForm({
    error,
    isLoading,
    onCancel,
    onRatingChange,
    onSubmit,
    onTextChange,
    rating,
    reviewId,
    text,
}: ProfileReviewEditFormProps) {
    const { t } = useTranslation()

    return (
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
                <label className="text-sm font-medium">
                    {t('review.rating')}
                </label>
                <div className="mt-2">
                    <RatingStars ariaLabel={t('review.rating')} value={rating} onChange={onRatingChange} />
                </div>
            </div>

            <div>
                <label
                    htmlFor={`profileReviewText-${reviewId}`}
                    className="text-sm font-medium"
                >
                    {t('review.text')}
                </label>
                <textarea
                    id={`profileReviewText-${reviewId}`}
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    className="mt-2 min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                    placeholder={t('review.textPlaceholder')}
                    required
                    minLength={10}
                    maxLength={1000}
                />
            </div>

            {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <Button
                    type="submit"
                    loading={isLoading}
                >
                    {t('review.update')}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={onCancel}
                >
                    {t('common.cancel')}
                </Button>
            </div>
        </form>
    )
}
