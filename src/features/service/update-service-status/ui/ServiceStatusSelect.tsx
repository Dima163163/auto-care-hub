import { toast } from 'sonner'

import type { Service } from '@/entities/service'
import { useUpdateServiceStatusMutation } from '@/entities/service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

type ServiceStatusSelectProps = {
    service: Service
}

export function ServiceStatusSelect({ service }: ServiceStatusSelectProps) {
    const { t } = useTranslation()
    const [updateServiceStatus, { isLoading }] =
        useUpdateServiceStatusMutation()

    const handleStatusChange = async (value: string) => {
        const nextIsActive = value === 'active'

        try {
            await updateServiceStatus({
                id: service.id,
                cabinetId: service.cabinetId,
                isActive: nextIsActive,
            }).unwrap()

            toast.success(t('service.form.statusUpdatedSuccessfully'))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('service.form.statusUpdatedFailed'),
            )

            toast.error(message)
        }
    }

    return (
        <select
            value={service.isActive ? 'active' : 'inactive'}
            disabled={isLoading}
            aria-busy={isLoading || undefined}
            onChange={(event) => void handleStatusChange(event.target.value)}
            className="min-h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
            <option value="active">{t('service.active')}</option>
            <option value="inactive">{t('service.inactive')}</option>
        </select>
    )
}
