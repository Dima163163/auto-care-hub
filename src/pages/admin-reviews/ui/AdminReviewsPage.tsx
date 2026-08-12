import { useState } from 'react'
import { toast } from 'sonner'

import {
    type AdminReview,
    type ReviewStatus,
    useDeleteAdminReviewMutation,
    useGetAdminReviewsQuery,
    useUpdateAdminReviewStatusMutation,
} from '@/entities/review'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { PageHeader } from '@/shared/ui/page-header'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'

import { AdminReviewsList } from './AdminReviewsList'

export function AdminReviewsPage() {
    const { t } = useTranslation()
    const {
        data: reviews = [],
        error,
        isFetching,
        isError,
        isLoading,
        refetch,
    } = useGetAdminReviewsQuery()
    const hasStaleReviews = reviews.length > 0
    const [updatingReview, setUpdatingReview] = useState<{ id: string; status: ReviewStatus } | null>(null)
    const [reviewToDelete, setReviewToDelete] = useState<AdminReview | null>(null)
    const [updateReviewStatus, { isLoading: isUpdating }] =
        useUpdateAdminReviewStatusMutation()
    const [deleteReview, { isLoading: isDeleting }] =
        useDeleteAdminReviewMutation()

    const handleStatusChange = async (id: string, status: ReviewStatus) => {
        try {
            setUpdatingReview({ id, status })
            await updateReviewStatus({ id, status }).unwrap()
            toast.success(t('adminReviews.statusUpdatedSuccessfully'))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminReviews.statusUpdateFailed'),
            )
            toast.error(message)
        } finally {
            setUpdatingReview(null)
        }
    }

    const handleDeleteReview = async () => {
        if (!reviewToDelete) {
            return
        }

        try {
            await deleteReview({
                id: reviewToDelete.id,
                cabinetId: reviewToDelete.cabinetId,
            }).unwrap()
            toast.success(t('adminReviews.deletedSuccessfully'))
            setReviewToDelete(null)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('adminReviews.deleteFailed'),
            )
            toast.error(message)
        }
    }

    return (
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <PageHeader
                    eyebrow={t('workspace.admin')}
                    title={t('adminReviews.title')}
                    description={t('adminReviews.description')}
                />

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {isLoading && (
                    <StateCard variant="loading" description={t('adminReviews.loading')} />
                )}

                {isError && !hasStaleReviews && (
                    <StateCard
                        title={t('common.failedToLoad')}
                        description={getApiErrorMessage(
                            error,
                            t('common.tryAgainLater'),
                        )}
                        action={
                            <RetryButton onRetry={refetch} label={t('common.retry')} />
                        }
                    />
                )}

                {isError && hasStaleReviews && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && reviews.length === 0 && (
                    <StateCard
                        title={t('adminReviews.emptyTitle')}
                        description={t('adminReviews.emptyDescription')}
                    />
                )}

                {!isLoading && (!isError || hasStaleReviews) && reviews.length > 0 && (
                    <AdminReviewsList
                        deletingReviewId={isDeleting ? reviewToDelete?.id ?? null : null}
                        isUpdating={isUpdating}
                        updatingReviewId={updatingReview?.id ?? null}
                        updatingReviewStatus={updatingReview?.status ?? null}
                        reviews={reviews}
                        onDeleteRequest={setReviewToDelete}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </section>

            <ConfirmDialog
                isOpen={Boolean(reviewToDelete)}
                eyebrow={t('adminReviews.confirmDeleteEyebrow')}
                title={t('adminReviews.confirmDeleteTitle')}
                description={t('adminReviews.confirmDeleteDescription')}
                cancelLabel={t('common.cancel')}
                confirmLabel={t('adminReviews.deleteAction')}
                loadingLabel={t('adminReviews.deleting')}
                isLoading={isDeleting}
                confirmVariant="destructive"
                onCancel={() => setReviewToDelete(null)}
                onConfirm={handleDeleteReview}
            >
                {reviewToDelete && (
                    <div>
                        <p className="font-medium">{reviewToDelete.client.name}</p>
                        <p className="mt-1 text-muted-foreground">
                            {reviewToDelete.text}
                        </p>
                    </div>
                )}
            </ConfirmDialog>
        </main>
    )
}
