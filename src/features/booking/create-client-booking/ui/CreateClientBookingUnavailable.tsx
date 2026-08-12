import { useTranslation } from '@/shared/lib/useTranslation'

export function CreateClientBookingUnavailable() {
    const { t } = useTranslation()

    return (
        <p className="mt-6 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t('booking.noActiveServicesForCabinet')}
        </p>
    )
}
