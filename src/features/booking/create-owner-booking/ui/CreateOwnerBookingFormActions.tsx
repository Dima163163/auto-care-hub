import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type CreateOwnerBookingFormActionsProps = {
    isCreatingBooking: boolean
    isSubmitDisabled: boolean
}

export function CreateOwnerBookingFormActions({
    isCreatingBooking,
    isSubmitDisabled,
}: CreateOwnerBookingFormActionsProps) {
    const { t } = useTranslation()

    return (
        <div className="mt-6 flex justify-end">
            <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full sm:w-auto"
            >
                {isCreatingBooking
                    ? t('booking.creating')
                    : t('booking.createBooking')}
            </Button>
        </div>
    )
}
