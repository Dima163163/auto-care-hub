import { Link } from 'react-router'

import { useGetMyReviewsQuery } from '@/entities/review'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { ProfileNavigation } from '@/widgets/profile-navigation/ui/ProfileNavigation'
import { buttonVariants } from '@/components/ui/button-variants'

import { ProfileReviewCard } from './ProfileReviewCard'
import { AutoCareReviewResolutionPanel } from './AutoCareReviewResolutionPanel'

export function ProfileReviewsPage() {
    const { t } = useTranslation()
    const {
        data: reviews = [],
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useGetMyReviewsQuery()

    if (isLoading) {
        return (
                <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
                <ProfileNavigation />
                <PageHeader
                    eyebrow={t('autocare.reviewsEyebrow')}
                    title={t('review.myReviewsTitle')}
                />

                <StateCard variant="loading" description={t('review.loading')} />
            </section>
        )
    }

    if (isError) {
        return (
            <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
                <ProfileNavigation />
                <PageHeader
                    eyebrow={t('autocare.reviewsEyebrow')}
                    title={t('review.myReviewsTitle')}
                />

                <StateCard
                    title={t('common.failedToLoad')}
                    description={t('common.tryAgainLater')}
                    variant="error"
                    action={
                        <RetryButton onRetry={refetch} label={t('common.retry')} />
                    }
                />
            </section>
        )
    }

    return (
        <section
            className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8"
            aria-busy={isFetching}
        >
            <ProfileNavigation />
            <QueryRefreshStatus
                isRefreshing={isFetching}
                label={t('common.refreshing')}
            />
            <PageHeader
                eyebrow={t('autocare.reviewsEyebrow')}
                title={t('review.myReviewsTitle')}
                description={t('review.myReviewsDescription')}
            />

            <AutoCareReviewResolutionPanel />

            {reviews.length === 0 ? (
                <StateCard
                    title={t('review.emptyMyReviewsTitle')}
                    description={t('review.emptyMyReviewsDescription')}
                    action={
                        <Link
                            to={ROUTES.profileBookings}
                            className={buttonVariants()}
                        >
                            {t('review.emptyMyReviewsAction')}
                        </Link>
                    }
                />
            ) : (
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <ProfileReviewCard key={review.id} review={review} />
                    ))}
                </div>
            )}
        </section>
    )
}
