import { CabinetStatusBadge, type Cabinet } from '@/entities/cabinet'
import { ROUTES } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'

import { AdminDashboardSectionHeader } from './AdminDashboardSectionHeader'

type AdminDashboardCabinetsProps = {
    cabinets: Cabinet[]
}

export function AdminDashboardCabinets({
    cabinets,
}: AdminDashboardCabinetsProps) {
    const { t } = useTranslation()

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <AdminDashboardSectionHeader
                description={t('adminDashboard.recentCabinetsDescription')}
                linkLabel={t('adminDashboard.viewAll')}
                title={t('adminDashboard.recentCabinets')}
                to={ROUTES.adminCabinets}
            />

            {cabinets.length === 0 && (
                <StateCard description={t('adminDashboard.noCabinets')} className="mt-4" />
            )}

            {cabinets.length > 0 && (
                <div className="space-y-3">
                    {cabinets.map((cabinet) => (
                        <div
                            key={cabinet.id}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        {cabinet.title}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('adminDashboard.cabinetMeta', {
                                            city: cabinet.city,
                                            price: formatCurrency(cabinet.pricePerHour),
                                        })}
                                    </p>
                                </div>

                                <CabinetStatusBadge status={cabinet.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
