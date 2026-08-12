import type { Cabinet } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type AdminCabinetBlockDialogProps = {
    cabinet?: Cabinet | undefined
    isLoading: boolean
    onCancel: () => void
    onConfirm: () => void
}

export function AdminCabinetBlockDialog({
    cabinet,
    isLoading,
    onCancel,
    onConfirm,
}: AdminCabinetBlockDialogProps) {
    const { t } = useTranslation()

    return (
        <ConfirmDialog
            isOpen={Boolean(cabinet)}
            eyebrow={t('adminCabinets.confirmBlockEyebrow')}
            title={t('adminCabinets.confirmBlockTitle')}
            description={t('adminCabinets.confirmBlockDescription')}
            cancelLabel={t('adminCabinets.keepAvailable')}
            confirmLabel={t('adminCabinets.confirmBlocking')}
            loadingLabel={t('adminCabinets.blockingAction')}
            isLoading={isLoading}
            confirmVariant="destructive"
            onCancel={onCancel}
            onConfirm={onConfirm}
        >
            {cabinet && (
                <>
                    <p className="font-medium">
                        {cabinet.title}
                    </p>

                    <p className="mt-1 text-muted-foreground">
                        {cabinet.city}, {cabinet.address}
                    </p>
                </>
            )}
        </ConfirmDialog>
    )
}
