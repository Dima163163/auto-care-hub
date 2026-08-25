import {
    UserRoleBadge,
    type User,
} from '@/entities/user'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { LogoutButton } from '../logout-button/LogoutButton'

type CurrentUserBadgeProps = {
    user?: User
    isError?: boolean
    isLoading?: boolean
    variant?: 'surface' | 'dark'
    compactAtTablet?: boolean
    compactMobile?: boolean
}

export function CurrentUserBadge({
    user,
    isError = false,
    isLoading = false,
    variant = 'surface',
    compactAtTablet = false,
    compactMobile = false,
}: CurrentUserBadgeProps) {
    const { t } = useTranslation()
    const isDark = variant === 'dark'
    const statusClass = isDark ? 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground' : 'border-border bg-card text-muted-foreground'

    if (isLoading) {
        return (
            <div className={`rounded-full border px-3 py-2 text-sm ${statusClass}`}>
                {t('auth.loadingUser')}
            </div>
        )
    }

    if (isError || !user) {
        return (
            <div className={`rounded-full border px-3 py-2 text-sm ${statusClass}`}>
                {t('auth.guestMode')}
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-2 rounded-full border p-1.5 shadow-sm ${isDark ? 'border-primary-foreground/25 bg-primary-foreground/10' : 'border-border bg-card'} ${compactMobile ? 'rounded-md border-0 bg-transparent p-0 shadow-none' : ''}`}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium ${isDark ? 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground' : 'border-border bg-background text-foreground'}`}>
                {user.name.slice(0, 1)}
            </div>

            <div className={`hidden items-center gap-2 ${compactAtTablet ? 'lg:flex' : 'sm:flex'}`}>
                {user.role === 'super_admin' ? (
                    <Link
                        to={ROUTES.adminDashboard}
                        className="rounded-full outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <UserRoleBadge role={user.role} />
                    </Link>
                ) : (
                    <UserRoleBadge role={user.role} />
                )}
            </div>

            <LogoutButton
                className={`h-8 rounded-full px-3 ${compactAtTablet ? 'max-lg:size-8 max-lg:px-0' : ''} ${compactMobile ? 'hidden' : ''}`}
                compactAtTablet={compactAtTablet}
                showIcon={compactAtTablet}
            />
        </div>
    )
}
