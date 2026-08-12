import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'

import { useGetCabinetByIdQuery } from '@/entities/cabinet'
import { useGetMyBookingsQuery } from '@/entities/booking'
import {
    useGetCabinetReviewsQuery,
    useGetMyReviewsQuery,
} from '@/entities/review'
import { canCreateCabinetReview } from '@/entities/review/lib/reviewEligibility'
import { useGetServicesByCabinetIdQuery } from '@/entities/service'
import { ROUTES } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { useTranslation } from '@/shared/lib/useTranslation'

import { CabinetDetailsBookingAccess } from './CabinetDetailsBookingAccess'
import { CabinetDetailsHero } from './CabinetDetailsHero'
import { CabinetDetailsLoading } from './CabinetDetailsLoading'
import { CabinetDetailsNotFound } from './CabinetDetailsNotFound'
import { CabinetDetailsReviews } from './CabinetDetailsReviews'
import { CabinetDetailsSidebar } from './CabinetDetailsSidebar'
import { CabinetReviewForm } from './CabinetReviewForm'

export function CabinetDetailsPage() {
    const { t } = useTranslation()
    const location = useLocation()
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const [selectedReviewId, setSelectedReviewId] = useState(
        searchParams.get('reviewId') ?? ''
    )
    const initialServiceId = searchParams.get('serviceId') ?? undefined
    const bookingSource = searchParams.get('source') === 'book_again'
        ? 'book_again' as const
        : undefined
    const sourceBookingId = bookingSource
        ? searchParams.get('sourceBookingId') ?? undefined
        : undefined
    const isFromFilteredCatalog = searchParams.get('from') === 'filtered-catalog'

    const {
        data: currentUser,
        isLoading: isCurrentUserLoading
    } = useGetMeQuery()

    const {
        data: cabinet,
        isLoading: isCabinetLoading,
        isError: isCabinetError,
    } = useGetCabinetByIdQuery(id ?? '', {
        skip: !id,
    })

    const cabinetId = cabinet?.id

    const {
        data: cabinetServices = [],
    } = useGetServicesByCabinetIdQuery(cabinetId ?? '', {
        skip: !cabinetId,
    })
    const {
        data: reviews = [],
        isLoading: isReviewsLoading,
        isError: isReviewsError,
        refetch: refetchReviews,
    } = useGetCabinetReviewsQuery(cabinetId ?? '', {
        skip: !cabinetId,
    })
    const {
        data: myReviews = [],
        isLoading: isMyReviewsLoading,
    } = useGetMyReviewsQuery(undefined, {
        skip: currentUser?.role !== 'client',
    })
    const {
        data: myBookings = [],
    } = useGetMyBookingsQuery(undefined, {
        skip: currentUser?.role !== 'client',
    })

    const activeServices = cabinetServices.filter(
        (service) => service.isActive
    )

    const cabinetClientReviews = useMemo(
        () => myReviews.filter((review) => review.cabinetId === cabinetId),
        [cabinetId, myReviews]
    )
    const selectedReview =
        cabinetClientReviews.find((review) => review.id === selectedReviewId) ??
        cabinetClientReviews[0] ??
        null

    const handleEditReviewClick = (reviewId: string) => {
        setSelectedReviewId(reviewId)
        document
            .getElementById('cabinet-review-form')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (isCabinetLoading) {
        return <CabinetDetailsLoading />
    }

    if (isCabinetError || !cabinet) {
        return <CabinetDetailsNotFound />
    }

    return (
        <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
            <section className="mb-4">
                <Link
                    to={ROUTES.cabinets}
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="size-4" />
                    {t('cabinet.details.backToCabinets')}
                </Link>
            </section>

            <div className="xl:grid xl:grid-cols-[minmax(0,1.68fr)_minmax(390px,0.82fr)] xl:items-start xl:gap-10">
                <div className="min-w-0 space-y-5">
                    <CabinetDetailsHero cabinet={cabinet} reviews={reviews} />
                    <CabinetDetailsSidebar cabinet={cabinet} />
                </div>

                <aside className="mt-8 xl:sticky xl:top-4 xl:mt-0">
                    <CabinetDetailsBookingAccess
                        cabinet={cabinet}
                        currentUser={currentUser}
                        isCurrentUserLoading={isCurrentUserLoading}
                        loginFrom={location}
                        services={activeServices}
                        initialServiceId={initialServiceId}
                        bookingSource={bookingSource}
                        sourceBookingId={sourceBookingId}
                        discoverySource={isFromFilteredCatalog}
                    />
                </aside>
            </div>

            <div className="mt-12 space-y-8 border-t border-border/80 pt-8">
                <CabinetDetailsReviews
                    currentUserId={currentUser?.id}
                    isError={isReviewsError}
                    isLoading={isReviewsLoading}
                    onEditReview={handleEditReviewClick}
                    onRetry={refetchReviews}
                    reviews={reviews}
                />

                {currentUser?.role === 'client' && !isMyReviewsLoading && (
                    <CabinetReviewForm
                        key={selectedReview?.id ?? 'create-review'}
                        cabinetId={cabinet.id}
                        isEmailVerified={Boolean(currentUser.emailVerifiedAt)}
                        canCreateReview={canCreateCabinetReview({
                            cabinetId: cabinet.id,
                            bookings: myBookings,
                            reviews,
                        }) || Boolean(selectedReview)}
                        existingReview={selectedReview}
                    />
                )}
            </div>
        </main>
    )
}
