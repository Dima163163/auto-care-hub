import { Bell, ChevronDown, Plus } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { useState } from 'react'

import { CurrentUserBadge, useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher'
import { ThemeSwitcher } from '@/widgets/theme-switcher'

export type WorkspaceRole = 'client' | 'owner' | 'admin'

const workspaceLabelKeys: Record<WorkspaceRole, TranslationKey> = {
    client: 'workspace.client',
    owner: 'workspace.owner',
    admin: 'workspace.admin',
}

function Logo() {
    return (
        <Link to={ROUTES.home} className="flex shrink-0 items-center gap-2">
            <BrandLogo />
        </Link>
    )
}

type WorkspaceHeaderProps = {
    role: WorkspaceRole
    showCreateProvider?: boolean
}

export function WorkspaceHeader({ role, showCreateProvider = false }: WorkspaceHeaderProps) {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()
    const [isMoreOpen, setIsMoreOpen] = useState(false)

    const links = [
        { to: ROUTES.serviceDiscovery, label: t('navigation.services') },
        { to: ROUTES.owners, label: t('navigation.owners') },
        { to: ROUTES.pricing, label: t('navigation.pricing') },
        { to: ROUTES.help, label: t('landing.footerHelpCenter') },
    ]

    return (
        <header className="hidden h-[72px] items-center gap-3 border-b bg-background px-3 md:flex lg:gap-7 lg:px-8">
            <Logo />

            <nav aria-label={t('navigation.mainNavigation')} className="hidden h-full items-center gap-5 lg:flex">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `flex h-full items-center border-b-2 px-1 text-[13px] font-semibold transition-colors hover:text-primary ${
                            isActive ? 'border-primary text-primary' : 'border-transparent text-foreground'
                        }`}
                    >
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <nav aria-label={t('navigation.mainNavigation')} className="flex h-full items-center gap-3 lg:hidden">
                {links.slice(0, 2).map((link, index) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `${index === 1 ? 'hidden lg:flex' : 'flex'} h-full items-center border-b-2 px-1 text-xs font-semibold transition-colors hover:text-primary ${
                            isActive ? 'border-primary text-primary' : 'border-transparent text-foreground'
                        }`}
                    >
                        {link.label}
                    </NavLink>
                ))}
                <div className="relative flex h-full items-center">
                    <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-primary"
                        title={t('common.more')}
                        aria-expanded={isMoreOpen}
                        onClick={() => setIsMoreOpen((value) => !value)}
                    >
                        {t('common.more')}
                        <ChevronDown className="size-3.5" />
                    </button>
                    {isMoreOpen && (
                        <div className="absolute left-0 top-[58px] z-40 w-44 rounded-lg border bg-popover p-2 shadow-lg">
                            {links.slice(1).map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setIsMoreOpen(false)}
                                    className={({ isActive }) => `block rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                                    }`}
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            </nav>

            <div className="ml-auto flex items-center gap-1.5 lg:gap-3">
                <div className="hidden items-center gap-2 border-l pl-5 text-xs font-bold text-muted-foreground xl:flex">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">{t(workspaceLabelKeys[role])}</span>
                </div>
                <LanguageSwitcher />
                <ThemeSwitcher />
                <Link
                    to={ROUTES.notifications}
                    className="flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted hover:text-primary"
                    aria-label={t('navigation.notifications')}
                >
                    <Bell className="size-4" />
                </Link>
                {showCreateProvider && (
                    <Link
                        to={ROUTES.ownerAutoCareProviders}
                        className="hidden h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 md:flex xl:px-4"
                        aria-label={t('autocare.ownerProvidersCreate')}
                    >
                        <Plus className="size-4" />
                        <span className="hidden xl:inline">{t('autocare.ownerProvidersCreate')}</span>
                    </Link>
                )}
                {isLoading ? (
                    <CurrentUserBadge isLoading />
                ) : (
                    <div className="flex items-center gap-2">
                        <CurrentUserBadge user={isError ? undefined : user} isError={isError} compactAtTablet />
                        <ChevronDown className="hidden size-4 text-muted-foreground xl:block" aria-hidden="true" />
                    </div>
                )}
            </div>
        </header>
    )
}
