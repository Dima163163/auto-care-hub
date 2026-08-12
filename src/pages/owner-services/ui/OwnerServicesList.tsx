import type { Service } from '@/entities/service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { OwnerServiceListItem } from './OwnerServiceListItem'

type OwnerServicesListProps = {
    isDeleting: boolean
    onCancelEdit: () => void
    onDelete: (serviceId: string) => void
    onEdit: (serviceId: string) => void
    serviceIdToEdit: string | null
    services: Service[]
}

export function OwnerServicesList({
    isDeleting,
    onCancelEdit,
    onDelete,
    onEdit,
    serviceIdToEdit,
    services,
}: OwnerServicesListProps) {
    const { t } = useTranslation()

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground lg:grid">
                <span>{t('service.form.serviceColumn')}</span>
                <span>{t('service.form.durationColumn')}</span>
                <span>{t('service.form.priceColumn')}</span>
                <span>{t('service.form.statusColumn')}</span>
            </div>

            <div className="divide-y">
                {services.map((service) => (
                    <OwnerServiceListItem
                        key={service.id}
                        isDeleting={isDeleting}
                        isEditing={serviceIdToEdit === service.id}
                        service={service}
                        onCancelEdit={onCancelEdit}
                        onDelete={() => onDelete(service.id)}
                        onEdit={() => onEdit(service.id)}
                    />
                ))}
            </div>
        </div>
    )
}
