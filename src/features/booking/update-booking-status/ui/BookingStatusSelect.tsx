import { useState } from 'react'
import { toast } from 'sonner'

import {
    type BookingStatus,
    BookingStatusBadge,
    useUpdateBookingStatusMutation,
} from '@/entities/booking'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'


type BookingStatusSelectProps = {
    bookingId: string
    status: BookingStatus
}

type BookingStatusOption = {
    value: BookingStatus
    labelKey: TranslationKey
    descriptionKey: TranslationKey
}

const BOOKING_STATUS_OPTIONS: BookingStatusOption[] = [
    {
        value: 'pending',
        labelKey: 'booking.pendingStatusLabel',
        descriptionKey: 'booking.pendingStatusDescription',
    },
    {
        value: 'confirmed',
        labelKey: 'booking.confirmedStatusLabel',
        descriptionKey: 'booking.confirmedStatusDescription',
    },
    {
        value: 'cancelled',
        labelKey: 'booking.cancelledStatusLabel',
        descriptionKey: 'booking.cancelledStatusDescription',
    },
    {
        value: 'completed',
        labelKey: 'booking.completedStatusLabel',
        descriptionKey: 'booking.completedStatusDescription',
    },
]

export function BookingStatusSelect({
    bookingId,
    status,
}: BookingStatusSelectProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [updateBookingStatus, { isLoading }] =
        useUpdateBookingStatusMutation()

    const currentStatusOption = BOOKING_STATUS_OPTIONS.find(
        (option) => option.value === status,
    )

    const handleStatusSelect = async (nextStatus: BookingStatus) => {
        setIsOpen(false)

        if (nextStatus === status) {
            return
        }

        try {
            await updateBookingStatus({
                id: bookingId,
                status: nextStatus,
            }).unwrap()

            toast.success(t('booking.statusUpdatedSuccessfully'))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('booking.failedToUpdateStatus'),
            )

            toast.error(message)
        }
    }

    return (
        <div
            className="relative inline-block w-full max-w-full text-left sm:w-auto sm:min-w-48"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOpen(false)
                }
            }}
        >
            <Button
                type="button"
                variant="outline"
                size="sm"
                loading={isLoading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="min-h-11 w-full justify-between gap-3 text-left"
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                <span className="flex items-center gap-2">
                    <BookingStatusBadge status={status} />
                </span>

                <span className="text-xs text-muted-foreground">
                    {isLoading ? t('booking.updating') : t('booking.changeStatus')}
                </span>
            </Button>

            {isOpen && (
                <div
                    role="listbox"
                    aria-label={t('booking.statusListLabel')}
                    className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover p-1 shadow-lg"
                >
                    {BOOKING_STATUS_OPTIONS.map((option) => {
                        const isSelected = option.value === status

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                disabled={isLoading}
                                className="flex min-h-11 w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => void handleStatusSelect(option.value)}
                            >
                                <span>
                                    <span className="font-medium">
                                        {t(option.labelKey)}
                                    </span>

                                    <span className="mt-1 block text-xs text-muted-foreground">
                                        {t(option.descriptionKey)}
                                    </span>
                                </span>

                                {isSelected && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {t('booking.currentStatus')}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
            {/*Screen readers text*/}
            <span className="sr-only">
                {t('booking.currentStatusScreenReader', {
                    status: currentStatusOption
                        ? t(currentStatusOption.labelKey)
                        : status,
                })}
            </span>
        </div>
    )
}
