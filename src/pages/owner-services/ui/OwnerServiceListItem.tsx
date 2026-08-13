import { Button } from '@/components/ui/button'
import { ServiceStatusBadge, type Service } from '@/entities/service'
import { ServiceStatusSelect } from '@/features/service/update-service-status'
import { UpdateServiceForm } from '@/features/service/update-service'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerServiceListItemProps = {
    isDeleting: boolean
    isEditing: boolean
    onCancelEdit: () => void
    onDelete: () => void
    onEdit: () => void
    service: Service
}

export function OwnerServiceListItem({
    isDeleting,
    isEditing,
    onCancelEdit,
    onDelete,
    onEdit,
    service,
}: OwnerServiceListItemProps) {
    const { t } = useTranslation()

    return (
        <div className="px-5 py-4">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
                <div>
                    <p className="font-medium">
                        {service.title}
                    </p>

                    {service.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {service.description}
                        </p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('autocare.ownerServiceLocationMeta', {
                            id: service.cabinetId,
                        })}
                    </p>
                </div>

                <div className="text-sm text-muted-foreground">
                    <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground lg:hidden">
                        {t('service.form.durationColumn')}
                    </span>
                    {t('service.form.durationMinutes', {
                        count: service.durationMinutes,
                    })}
                </div>

                <div className="text-sm font-medium">
                    <span className="mb-1 block text-xs font-medium uppercase text-muted-foreground lg:hidden">
                        {t('service.form.priceColumn')}
                    </span>
                    {formatCurrency(service.price)}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                    <div className="mr-auto lg:mr-0">
                        <ServiceStatusBadge isActive={service.isActive} />
                    </div>

                    <ServiceStatusSelect service={service} />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={onEdit}
                    >
                        {t('common.edit')}
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="min-h-11"
                        loading={isDeleting}
                        onClick={onDelete}
                    >
                        {t('common.delete')}
                    </Button>
                </div>
            </div>

            {isEditing && (
                <UpdateServiceForm
                    service={service}
                    onCancel={onCancelEdit}
                    onSuccess={onCancelEdit}
                />
            )}
        </div>
    )
}
