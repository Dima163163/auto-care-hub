import type { UserRole } from '@/entities/user'
import type { TranslationKey } from '@/shared/lib/i18n'

const accountLinkTranslationKeys = {
    admin: 'navigation.adminDashboard',
    super_admin: 'navigation.adminDashboard',
    owner: 'navigation.ownerDashboard',
    client: 'navigation.profile',
} satisfies Record<UserRole, TranslationKey>

export function getAccountLinkTranslationKey(role: UserRole) {
    return accountLinkTranslationKeys[role]
}
