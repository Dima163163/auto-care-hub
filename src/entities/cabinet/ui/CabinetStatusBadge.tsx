import type { CabinetStatus } from '../model/types'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'
import { StatusBadge } from '@/shared/ui/status-badge'

type CabinetStatusBadgeProps = {
    status: CabinetStatus
}

const statusVariant = {
    active: 'success',
    draft: 'warning',
    blocked: 'danger',
} as const satisfies Record<CabinetStatus, 'danger' | 'success' | 'warning'>

const statusLabelKey: Record<CabinetStatus, TranslationKey> = {
    active: 'cabinet.activeStatusLabel',
    draft: 'cabinet.draftStatusLabel',
    blocked: 'cabinet.blockedStatusLabel',
}

export function CabinetStatusBadge({ status }: CabinetStatusBadgeProps) {
    const { t } = useTranslation()

    return (
        <StatusBadge variant={statusVariant[status]}>
            {t(statusLabelKey[status])}
        </StatusBadge>
    )
}
