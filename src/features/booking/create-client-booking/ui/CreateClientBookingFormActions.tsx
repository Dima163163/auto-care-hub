import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type CreateClientBookingFormActionsProps = {
    formError: string | null
    isLoading: boolean
}

export function CreateClientBookingFormActions({
    formError,
    isLoading,
}: CreateClientBookingFormActionsProps) {
    const { t } = useTranslation()

    return (
        <>
            {formError && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {formError}
                </p>
            )}

            <Button type="submit" loading={isLoading} className="h-11 w-full text-base font-bold">
                {isLoading
                    ? t('booking.creatingBooking')
                    : t('booking.createBooking')}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" />
                {t('booking.secureBooking')} <span aria-hidden="true">·</span> {t('booking.instantConfirmation')}
            </p>
        </>
    )
}
