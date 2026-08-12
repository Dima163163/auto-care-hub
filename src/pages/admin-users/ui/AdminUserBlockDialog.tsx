import type { User } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type AdminUserBlockDialogProps = {
    isLoading: boolean
    onCancel: () => void
    onConfirm: () => void
    user?: User | undefined
}

export function AdminUserBlockDialog({
    isLoading,
    onCancel,
    onConfirm,
    user,
}: AdminUserBlockDialogProps) {
    const { t } = useTranslation()

    return (
        <ConfirmDialog
            isOpen={Boolean(user)}
            eyebrow={t('adminUsers.confirmBlockEyebrow')}
            title={t('adminUsers.confirmBlockTitle')}
            description={t('adminUsers.confirmBlockDescription')}
            cancelLabel={t('adminUsers.keepActive')}
            confirmLabel={t('adminUsers.confirmBlocking')}
            loadingLabel={t('adminUsers.blockingAction')}
            isLoading={isLoading}
            confirmVariant="destructive"
            onCancel={onCancel}
            onConfirm={onConfirm}
        >
            {user && (
                <>
                    <p className="font-medium">
                        {user.name}
                    </p>

                    <p className="mt-1 text-muted-foreground">
                        {user.email}
                    </p>
                </>
            )}
        </ConfirmDialog>
    )
}
