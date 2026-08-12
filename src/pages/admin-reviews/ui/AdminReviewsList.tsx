import type { AdminReview, ReviewStatus } from '@/entities/review'
import { RatingStars } from '@/entities/review'
import { Button } from '@/components/ui/button'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

type AdminReviewsListProps = {
    isUpdating: boolean
    updatingReviewId: string | null
    updatingReviewStatus: ReviewStatus | null
    deletingReviewId: string | null
    reviews: AdminReview[]
    onDeleteRequest: (review: AdminReview) => void
    onStatusChange: (id: string, status: ReviewStatus) => void
}

const moderationActions = [
    'pending',
    'approved',
    'rejected',
] satisfies ReviewStatus[]

const reviewStatusLabelKeys = {
    pending: 'review.pendingStatusLabel',
    approved: 'review.approvedStatusLabel',
    rejected: 'review.rejectedStatusLabel',
} satisfies Record<ReviewStatus, TranslationKey>

const moderationActionKeys = {
    pending: 'adminReviews.pendingAction',
    approved: 'adminReviews.approvedAction',
    rejected: 'adminReviews.rejectedAction',
} satisfies Record<(typeof moderationActions)[number], TranslationKey>

const reviewStatusClassNames = {
    pending: 'border-status-warning-border bg-status-warning-surface text-status-warning-foreground',
    approved: 'border-status-success-border bg-status-success-surface text-status-success-foreground',
    rejected: 'border-status-danger-border bg-status-danger-surface text-status-danger-foreground',
} satisfies Record<ReviewStatus, string>

export function AdminReviewsList({
    deletingReviewId,
    isUpdating,
    onDeleteRequest,
    onStatusChange,
    reviews,
    updatingReviewId,
    updatingReviewStatus,
}: AdminReviewsListProps) {
    const { t } = useTranslation()

    return (
        <div className="mt-8 grid gap-4">
            {reviews.map((review) => (
                <article
                    key={review.id}
                    aria-busy={updatingReviewId === review.id}
                    className="rounded-xl border bg-card p-5 shadow-sm"
                >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm text-muted-foreground">
                                {review.cabinet.title}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold">
                                {review.client.name}
                            </h2>
                            <div className="mt-2">
                                <RatingStars ariaLabel={t('review.rating')} value={review.rating} />
                            </div>
                        </div>

                        <span
                            className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${reviewStatusClassNames[review.status]}`}
                        >
                            {t(reviewStatusLabelKeys[review.status])}
                        </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {review.text}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {moderationActions.map((status) => (
                            <Button
                                key={status}
                                type="button"
                                disabled={
                                    (isUpdating &&
                                        updatingReviewId === review.id) ||
                                    deletingReviewId === review.id ||
                                    review.status === status
                                }
                                loading={isUpdating && updatingReviewId === review.id && updatingReviewStatus === status}
                                variant="outline"
                                className="min-h-11"
                                onClick={() => onStatusChange(review.id, status)}
                            >
                                {t(moderationActionKeys[status])}
                            </Button>
                        ))}

                        <Button
                            type="button"
                            disabled={deletingReviewId === review.id}
                            variant="outline"
                            className="min-h-11 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteRequest(review)}
                        >
                            {t('adminReviews.deleteAction')}
                        </Button>
                    </div>
                </article>
            ))}
        </div>
    )
}
