import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import {
    RatingStars,
    type Review,
    useCreateCabinetReviewMutation,
    useUpdateClientReviewMutation,
} from '@/entities/review'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'

type CabinetReviewFormProps = {
    cabinetId: string
    canCreateReview: boolean
    existingReview: Review | null
    isEmailVerified?: boolean
}

export function CabinetReviewForm({
    cabinetId,
    canCreateReview,
    existingReview,
    isEmailVerified = true,
}: CabinetReviewFormProps) {
    const { t } = useTranslation()
    const [rating, setRating] = useState(existingReview?.rating ?? 5)
    const [text, setText] = useState(existingReview?.text ?? '')
    const [formError, setFormError] = useState<string | null>(null)
    const [hasSubmittedReview, setHasSubmittedReview] = useState(false)
    const [createReview, { isLoading }] = useCreateCabinetReviewMutation()
    const [updateReview, { isLoading: isUpdating }] =
        useUpdateClientReviewMutation()
    const isEditing = Boolean(existingReview)
    const isSubmitting = isLoading || isUpdating

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        try {
            setFormError(null)
            if (existingReview) {
                await updateReview({
                    id: existingReview.id,
                    cabinetId,
                    rating,
                    text,
                }).unwrap()
            } else {
                await createReview({
                    cabinetId,
                    rating,
                    text,
                }).unwrap()
            }
            setText('')
            setRating(5)
            setHasSubmittedReview(true)
            toast.success(
                t(
                    isEditing
                        ? 'review.updatedForModeration'
                        : 'review.submittedForModeration'
                )
            )
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t(isEditing ? 'review.updateFailed' : 'review.submitFailed'),
            )
            setFormError(message)
            toast.error(message)
        }
    }

    return (
        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
            <div id="cabinet-review-form" className="-mt-24 pt-24" />

            <p className="text-sm font-medium text-muted-foreground">
                {t(isEditing ? 'review.editEyebrow' : 'review.createEyebrow')}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {t(isEditing ? 'review.editTitle' : 'review.createTitle')}
            </h2>

            {!canCreateReview && !hasSubmittedReview && (
                <p className="mt-3 text-sm text-muted-foreground">
                    {t('review.completedBookingRequired')}
                </p>
            )}

            {hasSubmittedReview && (
                <p className="mt-3 text-sm text-muted-foreground">
                    {t(
                        isEditing
                            ? 'review.updatedAwaitingModeration'
                            : 'review.awaitingModeration'
                    )}
                </p>
            )}

            {canCreateReview && !hasSubmittedReview && (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {!isEmailVerified && (
                        <div className="rounded-xl border border-status-warning-border bg-status-warning-surface p-4">
                            <p className="text-sm font-medium text-status-warning-foreground">
                                {t('auth.emailVerificationRequired')}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium">
                            {t('review.rating')}
                        </label>
                        <div className="mt-2">
                            <RatingStars ariaLabel={t('review.rating')} value={rating} onChange={setRating} />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="cabinetReviewText"
                            className="text-sm font-medium"
                        >
                            {t('review.text')}
                        </label>
                        <textarea
                            id="cabinetReviewText"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="mt-2 min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                            placeholder={t('review.textPlaceholder')}
                            required
                            minLength={10}
                            maxLength={1000}
                        />
                    </div>

                    {formError && (
                        <p className="text-sm font-medium text-destructive">
                            {formError}
                        </p>
                    )}

                    <Button
                        type="submit"
                        loading={isSubmitting}
                        disabled={!isEmailVerified}
                    >
                        {isSubmitting
                            ? t(isEditing ? 'review.updating' : 'review.submitting')
                            : t(isEditing ? 'review.update' : 'review.submit')}
                    </Button>
                </form>
            )}
        </section>
    )
}
