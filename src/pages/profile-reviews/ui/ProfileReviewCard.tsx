import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import {
    RatingStars,
    type ClientReview,
    useUpdateClientReviewMutation,
} from '@/entities/review'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProfileReviewEditForm } from './ProfileReviewEditForm'
import {
    reviewStatusClassNames,
    reviewStatusLabelKeys,
} from './reviewStatusUi'

type ProfileReviewCardProps = {
    review: ClientReview
}

export function ProfileReviewCard({ review }: ProfileReviewCardProps) {
    const { t } = useTranslation()
    const [isEditing, setIsEditing] = useState(false)
    const [rating, setRating] = useState(review.rating)
    const [text, setText] = useState(review.text)
    const [formError, setFormError] = useState<string | null>(null)
    const [updateReview, { isLoading }] = useUpdateClientReviewMutation()

    const handleCancelEdit = () => {
        setIsEditing(false)
        setFormError(null)
        setRating(review.rating)
        setText(review.text)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        try {
            setFormError(null)
            await updateReview({
                id: review.id,
                cabinetId: review.cabinetId,
                rating,
                text,
            }).unwrap()
            setIsEditing(false)
            toast.success(t('review.updatedForModeration'))
        } catch (error) {
            const message = getApiErrorMessage(error, t('review.updateFailed'))
            setFormError(message)
            toast.error(message)
        }
    }

    return (
        <article className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                        {review.cabinet.title}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                        {new Date(review.createdAt).toLocaleDateString()}
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

            {isEditing ? (
                <ProfileReviewEditForm
                    error={formError}
                    isLoading={isLoading}
                    rating={rating}
                    reviewId={review.id}
                    text={text}
                    onCancel={handleCancelEdit}
                    onRatingChange={setRating}
                    onSubmit={handleSubmit}
                    onTextChange={setText}
                />
            ) : (
                <>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {review.text}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                            onClick={() => setIsEditing(true)}
                        >
                            {t('review.editAction')}
                        </button>
                    </div>
                </>
            )}
        </article>
    )
}
