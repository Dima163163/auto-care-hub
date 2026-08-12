import { ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/shared/lib/useTranslation'

export function CreateClientBookingFormHeader() {
    const { t } = useTranslation()

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">
                        {t('booking.bookThisCabinet')}
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('cabinet.details.bookingPanelDescription')}
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-status-success-foreground">
                    <ShieldCheck className="size-4" />
                    {t('booking.secureBooking')}
                </span>
            </div>
        </div>
    )
}
