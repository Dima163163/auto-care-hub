import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CarFront, Heart, Headphones, History, MapPin, MessageCircle, Search, ShieldCheck, Star, Wrench } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { getBookingOverview, useCancelMyBookingMutation, useGetMyBookingsQuery } from '@/entities/booking'
import type { ClientBooking } from '@/entities/booking'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

import { getAutoCareRequestPresentation } from '../lib/getAutoCareRequestPresentation'
import { AutoCareRequestsPanel } from './AutoCareRequestsPanel'

type RequestTab = 'upcoming' | 'history' | 'cancelled'

const bookingStatusLabels = {
    pending: 'booking.pendingStatusLabel',
    confirmed: 'booking.confirmedStatusLabel',
    cancelled: 'booking.cancelledStatusLabel',
    completed: 'booking.completedStatusLabel',
} as const

export function ProfileBookingsPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<RequestTab>('upcoming')
    const [bookingIdToCancel, setBookingIdToCancel] = useState<string | null>(null)
    const [cancelMyBooking, { isLoading: isCancelLoading }] = useCancelMyBookingMutation()
    const { data: bookings = [], isLoading, isFetching, isError, error, refetch } = useGetMyBookingsQuery()

    useEffect(() => {
        if (!searchParams.has('payment') && !searchParams.has('booking_id')) return

        const nextSearchParams = new URLSearchParams(searchParams)

        nextSearchParams.delete('payment')
        nextSearchParams.delete('booking_id')
        setSearchParams(nextSearchParams, { replace: true })
    }, [searchParams, setSearchParams])

    const overview = useMemo(() => getBookingOverview(bookings), [bookings])
    const bookingsByTab: Record<RequestTab, ClientBooking[]> = {
        upcoming: overview.upcomingBookings,
        history: overview.completedBookings,
        cancelled: overview.cancelledBookings,
    }
    const bookingToCancel = bookings.find((booking) => booking.id === bookingIdToCancel)

    const cancelBooking = async () => {
        if (!bookingIdToCancel) return

        try {
            await cancelMyBooking({ id: bookingIdToCancel, reason: '' }).unwrap()
            toast.success(t('booking.bookingCancelledSuccessfully'))
            setBookingIdToCancel(null)
        } catch (requestError) {
            toast.error(getApiErrorMessage(requestError, t('booking.failedToCancelBooking')))
        }
    }

    if (isLoading) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-16"><StateCard variant="loading" description={t('booking.loadingBookings')} /></main>
    if (isError && bookings.length === 0) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-16"><StateCard variant="error" title={t('booking.failedToLoadBookings')} action={<RetryButton onRetry={refetch} label={t('common.retry')} />} /></main>

    return (
        <main className="bg-background">
            <div className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-7 sm:py-10">
                {isError ? <QueryRefreshError message={getApiErrorMessage(error, t('common.tryAgainLater'))} onRetry={refetch} retryLabel={t('common.retry')} /> : null}
                <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
                    <ClientAccountPanel />
                    <section aria-busy={isFetching} className="min-w-0">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">{t('autocare.clientRequestsTitle')}</h1>
                        <AutoCareRequestsPanel />
                        <RequestTabs activeTab={activeTab} counts={{ upcoming: overview.upcomingBookingsCount, history: overview.completedBookingsCount, cancelled: overview.cancelledBookingsCount }} onChange={setActiveTab} />
                        <BookingList bookings={bookingsByTab[activeTab]} tab={activeTab} onCancel={setBookingIdToCancel} />
                    </section>
                    <ClientSidebar />
                </div>
                <ClientTrustStrip />
            </div>
            <ConfirmDialog isOpen={Boolean(bookingToCancel)} eyebrow={t('booking.confirmCancellation')} title={t('booking.cancelThisBooking')} description={t('booking.cancelBookingDescription')} cancelLabel={t('booking.keepBooking')} confirmLabel={t('booking.confirmCancellationAction')} loadingLabel={t('booking.cancelling')} isLoading={isCancelLoading} confirmVariant="destructive" onCancel={() => setBookingIdToCancel(null)} onConfirm={() => void cancelBooking()}>{bookingToCancel ? <p className="text-sm font-semibold text-foreground">{bookingToCancel.service.title} · {bookingToCancel.date}, {bookingToCancel.startTime}</p> : null}</ConfirmDialog>
        </main>
    )
}

function ClientAccountPanel() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const initials = user?.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'AC'

    const links = [
        { to: ROUTES.profileBookings, icon: CalendarDays, label: t('autocare.clientRequestsTitle') },
        { to: ROUTES.favorites, icon: Heart, label: t('navigation.favorites') },
        { to: ROUTES.notifications, icon: MessageCircle, label: t('navigation.notifications') },
        { to: ROUTES.profile, icon: Wrench, label: t('navigation.profile') },
    ]

    return <aside className="h-fit rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex size-11 items-center justify-center rounded-full bg-hero-overlay text-sm font-black text-primary-foreground">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-black text-foreground">{user?.name ?? 'AutoCare клиент'}</p><p className="truncate text-[11px] font-medium text-muted-foreground">{user?.email}</p></div></div><p className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-status-success-foreground"><Star className="size-3.5 fill-current" />4.9 <span className="font-medium text-muted-foreground">(128 отзывов)</span></p><nav className="mt-4 grid gap-1">{links.map(({ to, icon: Icon, label }) => <Link key={to} to={to} className={to === ROUTES.profileBookings ? 'flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary/10 px-3 text-xs font-black text-primary' : 'flex h-10 items-center gap-2 rounded-[var(--radius-control)] px-3 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground'}><Icon className="size-4" />{label}</Link>)}</nav></aside>
}

type RequestTabsProps = {
    activeTab: RequestTab
    counts: Record<RequestTab, number>
    onChange: (tab: RequestTab) => void
}

function RequestTabs({ activeTab, counts, onChange }: RequestTabsProps) {
    const { t } = useTranslation()
    const tabs = [
        { id: 'upcoming' as const, label: t('autocare.clientRequestsUpcoming') },
        { id: 'history' as const, label: t('autocare.clientRequestsHistory') },
        { id: 'cancelled' as const, label: t('autocare.clientRequestsCancelled') },
    ]

    return <div className="mt-5 flex overflow-x-auto rounded-[var(--radius-panel)] border border-border bg-card px-2 shadow-sm" role="tablist">{tabs.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => onChange(id)} className={activeTab === id ? 'relative h-12 shrink-0 border-b-2 border-primary px-4 text-sm font-black text-primary' : 'h-12 shrink-0 px-4 text-sm font-bold text-muted-foreground hover:text-foreground'}>{label}{counts[id] ? <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{counts[id]}</span> : null}</button>)}</div>
}

type BookingListProps = {
    bookings: ClientBooking[]
    tab: RequestTab
    onCancel: (id: string) => void
}

function BookingList({ bookings, tab, onCancel }: BookingListProps) {
    const { t } = useTranslation()
    const sectionTitle = tab === 'upcoming' ? t('autocare.clientRequestsUpcoming') : tab === 'history' ? t('autocare.clientRequestsHistory') : t('autocare.clientRequestsCancelled')

    return <section className="mt-7"><h2 className="text-xl font-black tracking-tight text-foreground">{sectionTitle}</h2>{bookings.length ? <div className="mt-4 grid gap-4">{bookings.map((booking) => <ClientRequestCard key={booking.id} booking={booking} isUpcoming={tab === 'upcoming'} onCancel={onCancel} />)}</div> : <div className="mt-4 rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center"><p className="font-black text-foreground">{t('autocare.clientEmptyTitle')}</p><Link to={ROUTES.serviceDiscovery} className="mt-4 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground">{t('navigation.services')}</Link></div>}</section>
}

type ClientRequestCardProps = {
    booking: ClientBooking
    isUpcoming: boolean
    onCancel: (id: string) => void
}

function ClientRequestCard({ booking, isUpcoming, onCancel }: ClientRequestCardProps) {
    const { t, locale } = useTranslation()
    const presentation = getAutoCareRequestPresentation(booking)

    if (!presentation) return null

    const { offering, provider, requestNumber } = presentation
    const service = automotiveServices.find((candidate) => candidate.id === offering.serviceId)
    const providerHref = routePaths.serviceProviderDetails(provider.id)
    const serviceLabel = service ? getServiceLabel(service, locale) : offering.serviceId
    const statusLabel = t(bookingStatusLabels[booking.status])

    return <article className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="grid gap-4 p-4 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center"><AutoCareImage src={provider.image} alt={provider.name} className="size-16 rounded-[var(--radius-control)] object-cover sm:size-[76px]" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={booking.status === 'confirmed' ? 'rounded-full bg-status-success-surface px-2 py-1 text-[10px] font-black text-status-success-foreground' : booking.status === 'cancelled' ? 'rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-black text-destructive' : 'rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary'}>{statusLabel}</span><p className="text-[11px] font-bold text-muted-foreground">№ заявки {requestNumber}</p></div><h3 className="mt-2 text-sm font-black text-foreground">{provider.name}</h3><p className="mt-1 text-sm font-bold text-foreground">{serviceLabel}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-primary" />{booking.date}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" />{provider.address}</span></div></div><div className="text-left sm:text-right"><p className="text-lg font-black text-foreground">{offering.priceLabel}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{booking.startTime}–{booking.endTime}</p></div></div><div className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-4 py-3"><Link to={providerHref} className="mr-auto inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-black text-primary"><Search className="size-3.5" />{t('autocare.clientDetails')}</Link>{isUpcoming ? <><Link to={`${providerHref}#request`} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-black text-foreground"><MessageCircle className="size-3.5" />{t('autocare.clientAskService')}</Link><button type="button" onClick={() => onCancel(booking.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] px-2 text-xs font-black text-muted-foreground hover:text-destructive">{t('autocare.clientCancel')}</button></> : <Link to={routePaths.serviceRequest(provider.id, offering.serviceId)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{t('booking.bookAgain')}</Link>}</div></article>
}

function ClientSidebar() {
    const { t } = useTranslation()
    const quickActions = [
        { icon: Search, title: t('autocare.clientNewRequest'), text: t('autocare.clientNewRequestText'), to: ROUTES.serviceDiscovery },
        { icon: Heart, title: t('autocare.clientFavoritesAction'), text: t('autocare.clientFavoritesText'), to: ROUTES.favorites },
        { icon: History, title: t('autocare.clientMessagesAction'), text: t('autocare.clientMessagesText'), to: ROUTES.profileBookings },
        { icon: Headphones, title: t('autocare.clientSupportAction'), text: t('autocare.clientSupportText'), to: ROUTES.help },
    ]

    return <aside className="grid h-fit gap-4"><section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black text-foreground">{t('autocare.clientVehiclesTitle')}</h2><button type="button" className="text-[11px] font-black text-primary">{t('autocare.clientVehiclesAdd')}</button></div><div className="mt-4 rounded-[var(--radius-card)] bg-secondary p-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-hero-overlay text-primary-foreground"><CarFront className="size-4" /></span><div><p className="text-xs font-black text-foreground">BMW X5, 2021</p><p className="mt-1 text-[10px] font-bold text-muted-foreground">А123ВС 797</p></div></div></div><button type="button" className="mt-3 text-xs font-black text-primary">{t('autocare.clientVehiclesAll')}</button></section><section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><h2 className="text-sm font-black text-foreground">{t('autocare.clientQuickActions')}</h2><div className="mt-3 grid gap-1">{quickActions.map(({ icon: Icon, title, text, to }) => <Link key={title} to={to} className="flex gap-3 rounded-[var(--radius-control)] p-2.5 hover:bg-secondary"><span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-xs font-black text-foreground">{title}</span><span className="mt-0.5 block text-[10px] font-semibold leading-4 text-muted-foreground">{text}</span></span></Link>)}</div></section></aside>
}

function ClientTrustStrip() {
    const { t } = useTranslation()
    const items = [
        { icon: ShieldCheck, title: t('autocare.clientFooterTrusted'), text: t('autocare.clientFooterTrustedText') },
        { icon: Star, title: t('autocare.clientFooterReviews'), text: t('autocare.clientFooterReviewsText') },
        { icon: CalendarDays, title: t('autocare.clientFooterConvenient'), text: t('autocare.clientFooterConvenientText') },
        { icon: Wrench, title: t('autocare.clientFooterDirect'), text: t('autocare.clientFooterDirectText') },
    ]

    return <section className="mt-10 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{t('autocare.clientFooterTitle')}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><Icon className="size-4" /></span><p className="text-xs font-bold leading-5 text-foreground"><span className="block">{title}</span><span className="block font-medium text-muted-foreground">{text}</span></p></div>)}</div></section>
}
