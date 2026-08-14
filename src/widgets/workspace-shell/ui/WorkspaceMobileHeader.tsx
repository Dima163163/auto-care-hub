import { Bell, CarFront } from 'lucide-react'
import { Link } from 'react-router'

import { CurrentUserBadge, CurrentUserMenu, useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { ThemeSwitcher } from '@/widgets/theme-switcher'

import type { WorkspaceRole } from './WorkspaceHeader'

const workspaceLabelKeys: Record<WorkspaceRole, TranslationKey> = {
    client: 'workspace.client',
    owner: 'workspace.owner',
    admin: 'workspace.admin',
    super_admin: 'user.superAdmin',
}

type WorkspaceMobileHeaderProps = {
    role: WorkspaceRole
}

export function WorkspaceMobileHeader({ role }: WorkspaceMobileHeaderProps) {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-primary-foreground/10 bg-hero-overlay px-4 text-primary-foreground md:hidden">
            <Link to={ROUTES.home} className="flex shrink-0 items-center" aria-label="AutoCare Hub">
                <BrandLogo size="md" />
            </Link>

            <div className="flex min-w-0 items-center gap-2">
                {role === 'owner' && (
                    <Link
                        to={ROUTES.ownerAutoCareProviders}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary"
                        aria-label={t('autocare.ownerProvidersTitle')}
                        title={t('autocare.ownerProvidersTitle')}
                    >
                        <CarFront className="size-4" aria-hidden="true" />
                    </Link>
                )}
                <ThemeSwitcher />
                <span className="hidden max-w-32 truncate rounded-md bg-primary-foreground/10 px-2 py-1 text-xs font-bold text-primary-foreground/85 sm:inline-flex">
                    {t(workspaceLabelKeys[role])}
                </span>
                <Link
                    to={ROUTES.notifications}
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary"
                    aria-label={t('navigation.notifications')}
                >
                    <Bell className="size-4" />
                </Link>
                {isLoading ? <CurrentUserBadge isLoading variant="dark" /> : user ? <CurrentUserMenu user={user} variant="dark" /> : <CurrentUserBadge isError={isError} variant="dark" compactMobile />}
            </div>
        </header>
    )
}
