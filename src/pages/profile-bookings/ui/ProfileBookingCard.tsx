import { CalendarDays, Clock3, MapPin, MessageCircle, Repeat2 } from 'lucide-react'
import { Link } from 'react-router'

import { type ClientBooking, BookingStatusBadge } from '@/entities/booking'
import { CancelClientBookingButton } from '@/features/booking/cancel-client-booking'
import { RequestBookingRescheduleButton } from '@/features/booking/request-reschedule/ui/RequestBookingRescheduleButton'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { buttonVariants } from '@/components/ui/button-variants'

type ProfileBookingCardProps = {
    booking: ClientBooking
}

export function ProfileBookingCard({ booking }: ProfileBookingCardProps) {
    const { t } = useTranslation()
    const { cabinet, service } = booking
    const isFinal = booking.status === 'completed' || booking.status === 'cancelled'
    const serviceHref = routePaths.serviceProviderDetails(cabinet.id)
    const rebookHref = routePaths.serviceRequest(cabinet.id, service.id)

    return (
        <article id={`booking-${booking.id}`} className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><CalendarDays className="size-6" /></div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-foreground">{cabinet.title}</h2><BookingStatusBadge status={booking.status} /></div><p className="mt-1 text-sm font-bold text-foreground">{service.title}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-primary" />{booking.date}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{booking.startTime}–{booking.endTime}</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" />{cabinet.city}</span></div></div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end"><strong className="mr-auto text-base font-black text-foreground lg:mr-2">{formatCurrency(service.price)}</strong><Link to={`${serviceHref}#request`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'min-h-10' })}><MessageCircle className="size-4" />{t('autocare.messageAction')}</Link>{isFinal ? <Link to={rebookHref} className={buttonVariants({ size: 'sm', className: 'min-h-10' })}><Repeat2 className="size-4" />{t('booking.bookAgain')}</Link> : <><RequestBookingRescheduleButton booking={booking} /><CancelClientBookingButton booking={booking} /></>}</div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-secondary/60 px-4 py-3 text-xs font-semibold text-muted-foreground sm:px-5"><Link to={serviceHref} className="font-black text-primary hover:underline">{t('autocare.detailsAction')}</Link></div>
        </article>
    )
}
