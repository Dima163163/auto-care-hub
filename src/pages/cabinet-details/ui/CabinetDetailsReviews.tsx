import { useMemo, useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'

import type { Review } from '@/entities/review'
import { RatingStars } from '@/entities/review'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type CabinetDetailsReviewsProps = {
    currentUserId?: string | undefined
    isError: boolean
    isLoading: boolean
    onEditReview: (reviewId: string) => void
    onRetry: () => void | Promise<unknown>
    reviews: Review[]
}

type ReviewFilter = 'all' | 'latest' | 'highest' | 'lowest'

export function CabinetDetailsReviews({
    currentUserId,
    isError,
    isLoading,
    onEditReview,
    onRetry,
    reviews,
}: CabinetDetailsReviewsProps) {
    const { t } = useTranslation()
    const [filter, setFilter] = useState<ReviewFilter>('all')
    const averageRating = reviews.length > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0
    const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter((review) => review.rating === rating).length,
    }))
    const visibleReviews = useMemo(() => {
        const result = [...reviews]

        if (filter === 'latest') {
            return result.sort((first, second) => second.createdAt.localeCompare(first.createdAt))
        }
        if (filter === 'highest') {
            return result.sort((first, second) => second.rating - first.rating)
        }
        if (filter === 'lowest') {
            return result.sort((first, second) => first.rating - second.rating)
        }

        return result
    }, [filter, reviews])

    return (
        <section id="cabinet-reviews" aria-labelledby="cabinet-reviews-title">
            <div className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                        {t('review.publicEyebrow')}
                    </p>
                    <h2 id="cabinet-reviews-title" className="mt-1 text-2xl font-black tracking-tight">
                        {t('review.publicTitle')}
                    </h2>
                </div>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Star className="size-4 fill-rating-fill text-rating-fill" />
                        {averageRating.toFixed(1)} <span className="font-normal text-muted-foreground">({reviews.length})</span>
                    </div>
                )}
            </div>

            {isLoading && (
                <div role="status" className="mt-5 space-y-3">
                    <span className="sr-only">{t('review.loading')}</span>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}

            {!isLoading && isError && (
                <div role="alert" className="mt-5 rounded-md bg-destructive/5 p-4">
                    <p className="font-medium text-destructive">{t('common.failedToLoad')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('common.tryAgainLater')}</p>
                    <RetryButton className="mt-3" onRetry={onRetry} label={t('common.retry')} />
                </div>
            )}

            {!isLoading && !isError && reviews.length === 0 && (
                <p className="mt-5 text-sm text-muted-foreground">
                    {t('review.emptyPublic')}
                </p>
            )}

            {!isLoading && !isError && reviews.length > 0 && (
                <>
                    <div className="mt-6 grid gap-6 border-b border-border/80 pb-6 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
                        <div className="text-center md:border-r md:pr-6">
                            <p className="text-4xl font-black">{averageRating.toFixed(1)}</p>
                            <RatingStars ariaLabel={t('review.rating')} value={averageRating} />
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t('cabinet.details.verifiedBookingsCount', { count: reviews.length })}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {ratingDistribution.map(({ rating, count }) => (
                                <div key={rating} className="grid grid-cols-[18px_minmax(0,1fr)_28px] items-center gap-2 text-xs text-muted-foreground">
                                    <span>{rating}</span>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-rating-fill" style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        {(['all', 'latest', 'highest', 'lowest'] as ReviewFilter[]).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFilter(value)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === value ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50 hover:bg-muted'}`}
                            >
                                {t(`cabinet.details.reviewFilter${value[0].toUpperCase()}${value.slice(1)}` as 'cabinet.details.reviewFilterAll')}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5 grid gap-5">
                        {visibleReviews.map((review) => (
                            <article key={review.id} className="border-b border-border/70 pb-5 last:border-b-0">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                            {review.client.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                        <div>
                                            <h3 className="font-semibold">{review.client.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(review.createdAt).toLocaleDateString()} · {t('cabinet.details.verifiedBooking')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RatingStars ariaLabel={t('review.rating')} value={review.rating} />
                                        {review.clientId === currentUserId && (
                                            <button
                                                type="button"
                                                className="text-xs font-semibold text-primary hover:underline"
                                                onClick={() => onEditReview(review.id)}
                                            >
                                                {t('review.editAction')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                                    {review.text}
                                </p>
                                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-status-success-foreground">
                                    <CheckCircle2 className="size-3.5" />
                                    {t('cabinet.details.verifiedBooking')}
                                </p>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
