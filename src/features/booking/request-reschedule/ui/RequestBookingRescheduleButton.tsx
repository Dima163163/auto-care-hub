import { useState } from 'react'
import { toast } from 'sonner'

import {
    type Booking,
    type BookingStatus,
    useRequestBookingRescheduleMutation,
} from '@/entities/booking'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog/Dialog'

type RequestBookingRescheduleButtonProps = {
    booking: Booking
}

const canRescheduleBooking = (status: BookingStatus) =>
    status === 'pending' || status === 'confirmed'

export function RequestBookingRescheduleButton({
    booking,
}: RequestBookingRescheduleButtonProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [date, setDate] = useState(booking.date)
    const [startTime, setStartTime] = useState(booking.startTime)
    const [endTime, setEndTime] = useState(booking.endTime)
    const [requestReschedule, { isLoading }] = useRequestBookingRescheduleMutation()

    if (!canRescheduleBooking(booking.status)) {
        return null
    }

    const handleSubmit = async () => {
        try {
            await requestReschedule({
                id: booking.id,
                date,
                startTime,
                endTime,
            }).unwrap()
            toast.success(t('booking.rescheduleRequested'))
            setIsOpen(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('booking.rescheduleRequestFailed')))
        }
    }

    return (
        <>
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setIsOpen(true)}>
                {t('booking.requestReschedule')}
            </Button>

            <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
                <DialogHeader>
                    <DialogTitle>{t('booking.rescheduleTitle')}</DialogTitle>
                    <DialogDescription>{t('booking.rescheduleDescription')}</DialogDescription>
                </DialogHeader>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm font-medium sm:col-span-3">
                        {t('booking.date')}
                        <input className="rounded-lg border bg-background px-3 py-2" min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                        {t('booking.startTime')}
                        <input className="rounded-lg border bg-background px-3 py-2" onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                        {t('booking.endTime')}
                        <input className="rounded-lg border bg-background px-3 py-2" onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
                    </label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button loading={isLoading} disabled={startTime >= endTime} type="button" onClick={() => void handleSubmit()}>
                        {isLoading ? t('booking.creating') : t('booking.requestReschedule')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    )
}
