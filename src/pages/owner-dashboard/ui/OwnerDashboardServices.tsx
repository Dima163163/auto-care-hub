import { ServiceStatusBadge, type Service } from '@/entities/service'
import { ROUTES } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

import { OwnerDashboardSectionHeader } from './OwnerDashboardSectionHeader'

type OwnerDashboardServicesProps = {
    hasServices: boolean
    services: Service[]
}

export function OwnerDashboardServices({
    hasServices,
    services,
}: OwnerDashboardServicesProps) {
    const { t } = useTranslation()

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <OwnerDashboardSectionHeader
                description={t('ownerDashboard.activeServicesDescription')}
                linkLabel={t('ownerDashboard.viewAll')}
                title={t('ownerDashboard.activeServices')}
                to={ROUTES.ownerServices}
            />

            {!hasServices && (
                <p className="text-sm text-muted-foreground">
                    {t('ownerDashboard.noServices')}
                </p>
            )}

            {hasServices && (
                <div className="space-y-3">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        {service.title}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('ownerDashboard.serviceMeta', {
                                            duration: service.durationMinutes,
                                            price: formatCurrency(service.price),
                                        })}
                                    </p>
                                </div>

                                <ServiceStatusBadge isActive={service.isActive} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
