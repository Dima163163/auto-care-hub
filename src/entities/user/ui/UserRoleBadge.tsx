import type { UserRole } from '../model/types'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'
import { StatusBadge, type StatusBadgeVariant } from '@/shared/ui/status-badge'

type UserRoleBadgeProps = {
    role: UserRole
}

const roleVariant: Record<UserRole, StatusBadgeVariant> = {
    client: 'info',
    owner: 'success',
    admin: 'neutral',
    super_admin: 'warning',
}

const roleLabelKey: Record<UserRole, TranslationKey> = {
    client: 'user.client',
    owner: 'user.owner',
    admin: 'user.admin',
    super_admin: 'user.superAdmin',
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
    const { t } = useTranslation()

    return (
        <StatusBadge variant={roleVariant[role]}>
            {t(roleLabelKey[role])}
        </StatusBadge>
    )
}
