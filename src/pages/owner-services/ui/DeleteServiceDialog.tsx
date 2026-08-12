import type { Service } from '@/entities/service'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type DeleteServiceDialogProps = {
    isLoading: boolean
    onCancel: () => void
    onConfirm: () => void
    service?: Service | undefined
}

export function DeleteServiceDialog({
    isLoading,
    onCancel,
    onConfirm,
    service,
}: DeleteServiceDialogProps) {
    const { t } = useTranslation()

    return (
        <ConfirmDialog
            isOpen={Boolean(service)}
            eyebrow={t('service.form.confirmDeleteEyebrow')}
            title={t('service.form.confirmDeleteTitle')}
            description={t('service.form.confirmDeleteDescription')}
            cancelLabel={t('service.form.keepService')}
            confirmLabel={t('service.form.deleteService')}
            loadingLabel={t('service.form.deletingAction')}
            isLoading={isLoading}
            confirmVariant="destructive"
            onCancel={onCancel}
            onConfirm={onConfirm}
        >
            {service && (
                <>
                    <p className="font-medium">
                        {service.title}
                    </p>

                    <p className="mt-1 text-muted-foreground">
                        {t('service.form.durationMinutes', {
                            count: service.durationMinutes,
                        })} · {formatCurrency(service.price)}
                    </p>
                </>
            )}
        </ConfirmDialog>
    )
}
