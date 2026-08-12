import { useState } from 'react'
import { toast } from 'sonner'

import {
    type Booking,
    type BookingStatus,
    useCancelMyBookingMutation,
} from '@/entities/booking'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type CancelClientBookingButtonProps = {
    booking: Booking
}

const canCancelBooking = (status: BookingStatus) =>
    status === 'pending' || status === 'confirmed'

export function CancelClientBookingButton({ booking }: CancelClientBookingButtonProps) {
    const { t } = useTranslation()
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [reason, setReason] = useState('')

    const [cancelMyBooking, { isLoading }] =
        useCancelMyBookingMutation()

    const handleConfirmCancelBooking = async () => {
        try {
            await cancelMyBooking({ id: booking.id, reason }).unwrap()

            toast.success(t('booking.bookingCancelledSuccessfully'))
            setIsConfirmOpen(false)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('booking.failedToCancelBooking'),
            )

            toast.error(message)
        }
    }

    if (!canCancelBooking(booking.status)) {
        return null
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={isLoading}
                onClick={() => setIsConfirmOpen(true)}
            >
                {t('booking.cancelBooking')}
            </Button>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                eyebrow={t('booking.confirmCancellation')}
                title={t('booking.cancelThisBooking')}
                description={t('booking.cancelBookingDescription')}
                cancelLabel={t('booking.keepBooking')}
                confirmLabel={t('booking.confirmCancellationAction')}
                loadingLabel={t('booking.cancelling')}
                isLoading={isLoading}
                confirmVariant="destructive"
                onCancel={() => setIsConfirmOpen(false)}
                onConfirm={() => void handleConfirmCancelBooking()}
            >
                <p className="font-medium">
                    {booking.date}
                </p>

                <p className="mt-1 text-muted-foreground">
                    {booking.startTime}–{booking.endTime}
                </p>

                <label className="mt-4 block text-sm font-medium" htmlFor={`cancel-reason-${booking.id}`}>
                    {t('booking.cancellationReason')}
                    <textarea
                        id={`cancel-reason-${booking.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="mt-2 min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder={t('booking.cancellationReasonPlaceholder')}
                    />
                </label>
            </ConfirmDialog>
        </>
    )
}
