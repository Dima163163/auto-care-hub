import { useTranslation } from '@/shared/lib/useTranslation'

type CreateOwnerBookingFormHeaderProps = {
    formError: string | null
}

export function CreateOwnerBookingFormHeader({
    formError,
}: CreateOwnerBookingFormHeaderProps) {
    const { t } = useTranslation()

    return (
        <>
            <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight">
                    {t('booking.createBooking')}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t('booking.createBookingForClient')}
                </p>
            </div>

            {formError && (
                <div role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">
                        {formError}
                    </p>
                </div>
            )}
        </>
    )
}
