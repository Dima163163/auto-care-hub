import { useTranslation } from '@/shared/lib/useTranslation'
import { StatusBadge } from '@/shared/ui/status-badge'

type ServiceStatusBadgeProps = {
    isActive: boolean
}

export function ServiceStatusBadge({ isActive }: ServiceStatusBadgeProps) {
    const { t } = useTranslation()

    return (
        <StatusBadge variant={isActive ? 'success' : 'neutral'}>
            {isActive ? t('service.active') : t('service.inactive')}
        </StatusBadge>
    )
}
