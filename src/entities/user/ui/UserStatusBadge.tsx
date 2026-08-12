import type { UserStatus } from '../model/types'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'
import { StatusBadge } from '@/shared/ui/status-badge'

type UserStatusBadgeProps = {
    status: UserStatus
}

const statusVariant = {
    active: 'success',
    blocked: 'danger',
} as const satisfies Record<UserStatus, 'danger' | 'success'>

const statusLabelKey: Record<UserStatus, TranslationKey> = {
    active: 'user.activeStatusLabel',
    blocked: 'user.blockedStatusLabel',
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
    const { t } = useTranslation()

    return (
        <StatusBadge variant={statusVariant[status]}>
            {t(statusLabelKey[status])}
        </StatusBadge>
    )
}
