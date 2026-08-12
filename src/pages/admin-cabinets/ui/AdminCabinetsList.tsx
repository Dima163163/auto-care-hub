import type { Cabinet, CabinetStatus } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

import { AdminCabinetsListItem } from './AdminCabinetsListItem'

type AdminCabinetsListProps = {
    cabinets: Cabinet[]
    isUpdating: boolean
    onStatusChange: (id: string, status: CabinetStatus) => void
}

export function AdminCabinetsList({
    cabinets,
    isUpdating,
    onStatusChange,
}: AdminCabinetsListProps) {
    const { t } = useTranslation()

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_1fr] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
                <span>{t('cabinet.title')}</span>
                <span>{t('user.owner')}</span>
                <span>{t('cabinet.form.cityLabel')}</span>
                <span>{t('service.form.priceColumn')}</span>
                <span>{t('common.status')}</span>
                <span>{t('common.actions')}</span>
            </div>

            <div className="divide-y">
                {cabinets.map((cabinet) => (
                    <AdminCabinetsListItem
                        key={cabinet.id}
                        cabinet={cabinet}
                        isUpdating={isUpdating}
                        onStatusChange={onStatusChange}
                    />
                ))}
            </div>
        </div>
    )
}
