import { useState } from 'react'
import { toast } from 'sonner'

import {
    type BookingRescheduleRequest,
    useResolveBookingRescheduleMutation,
} from '@/entities/booking'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

type ResolveBookingRescheduleActionsProps = {
    request: BookingRescheduleRequest
}

export function ResolveBookingRescheduleActions({ request }: ResolveBookingRescheduleActionsProps) {
    const { t } = useTranslation()
    const [reason, setReason] = useState('')
    const [resolveReschedule, { isLoading }] = useResolveBookingRescheduleMutation()

    const resolve = async (decision: 'accepted' | 'rejected') => {
        try {
            await resolveReschedule({
                id: request.bookingId,
                decision,
                reason: reason.trim() || undefined,
            }).unwrap()
            toast.success(t('booking.rescheduleUpdated'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('booking.rescheduleUpdateFailed')))
        }
    }

    return (
        <section className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">{t('booking.pendingReschedule')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
                {request.proposedDate} · {request.proposedStartTime}–{request.proposedEndTime}
            </p>
            <label className="mt-3 grid gap-2 text-sm font-medium">
                {t('booking.rescheduleDecisionReason')}
                <textarea className="min-h-20 rounded-lg border bg-background px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button loading={isLoading} size="sm" type="button" onClick={() => void resolve('accepted')}>
                    {t('booking.acceptReschedule')}
                </Button>
                <Button loading={isLoading} size="sm" type="button" variant="outline" onClick={() => void resolve('rejected')}>
                    {t('booking.rejectReschedule')}
                </Button>
            </div>
        </section>
    )
}
