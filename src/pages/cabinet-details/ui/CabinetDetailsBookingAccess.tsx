import { Link, type Location } from 'react-router'
import { ShieldCheck } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import type { User } from '@/entities/user'
import type { Service } from '@/entities/service'
import type { Cabinet } from '@/entities/cabinet'
import { CreateClientBookingForm } from '@/features/booking/create-client-booking'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type CabinetDetailsBookingAccessProps = {
    cabinet: Pick<Cabinet, 'id' | 'title' | 'address' | 'city'>
    currentUser?: User | undefined
    isCurrentUserLoading: boolean
    loginFrom: Location
    services: Service[]
    initialServiceId?: string | undefined
    bookingSource?: 'book_again' | undefined
    sourceBookingId?: string | undefined
    discoverySource?: boolean | undefined
}

export function CabinetDetailsBookingAccess({
    cabinet,
    currentUser,
    isCurrentUserLoading,
    loginFrom,
    services,
    initialServiceId,
    bookingSource,
    sourceBookingId,
    discoverySource,
}: CabinetDetailsBookingAccessProps) {
    const { t } = useTranslation()
    const loginState = {
        from: loginFrom,
        message: t('cabinet.details.signInRequiredMessage'),
    }

    if (isCurrentUserLoading) {
        return (
            <section className="rounded-md border bg-card p-5 shadow-sm">
                <p className="text-muted-foreground">
                    {t('cabinet.details.checkingBookingAccess')}
                </p>
            </section>
        )
    }

    if (!currentUser) {
        return (
            <section className="rounded-md border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                            {t('cabinet.details.booking')}
                        </p>
                        <h2 className="mt-2 text-xl font-bold tracking-tight">
                            {t('cabinet.details.signInToBook')}
                        </h2>
                    </div>
                    <ShieldCheck className="size-5 shrink-0 text-status-success-foreground" />
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                    {t('cabinet.details.signInToBookDescription')}
                </p>

                <Link
                    to={ROUTES.login}
                    state={loginState}
                    className={buttonVariants({ className: 'mt-6 w-full' })}
                >
                    {t('cabinet.details.signInToContinue')}
                </Link>
            </section>
        )
    }

    if (currentUser.role !== 'client') {
        return (
            <section className="rounded-md border bg-card p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {t('cabinet.details.booking')}
                </p>

                <h2 className="mt-2 text-xl font-bold tracking-tight">
                    {t('cabinet.details.clientAccountRequired')}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                    {t('cabinet.details.clientAccountRequiredDescription')}
                </p>
            </section>
        )
    }

    if (!currentUser.emailVerifiedAt) {
        return (
            <section className="rounded-md border border-status-warning-border bg-status-warning-surface p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-status-warning-foreground">
                    {t('cabinet.details.booking')}
                </p>

                <h2 className="mt-2 text-xl font-bold tracking-tight text-status-warning-foreground">
                    {t('auth.unverifiedEmailTitle')}
                </h2>

                <p className="mt-2 text-sm text-status-warning-foreground">
                    {t('auth.unverifiedEmailDescription')}
                </p>

                <Link
                    to={ROUTES.profile}
                    className={buttonVariants({
                        variant: 'outline',
                        className: 'mt-6 w-full border-status-warning-border bg-card hover:bg-status-warning-surface hover:text-status-warning-foreground',
                    })}
                >
                    {t('navigation.profile')}
                </Link>
            </section>
        )
    }

    return (
        <CreateClientBookingForm
            cabinetId={cabinet.id}
            cabinet={cabinet}
            services={services}
            initialServiceId={initialServiceId}
            bookingSource={bookingSource}
            sourceBookingId={sourceBookingId}
            discoverySource={discoverySource}
        />
    )
}
