import { Bell, CarFront, Menu, X } from 'lucide-react'
import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'

import { CurrentUserBadge, CurrentUserMenu, useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { ThemeSwitcher } from '@/widgets/theme-switcher'

import type { WorkspaceRole } from './WorkspaceHeader'
import { WorkspaceMobileMenu } from './WorkspaceMobileMenu'

const workspaceLabelKeys: Record<WorkspaceRole, TranslationKey> = {
    client: 'workspace.client',
    owner: 'workspace.owner',
    manager: 'workspace.owner',
    staff: 'workspace.owner',
    admin: 'workspace.admin',
    super_admin: 'user.superAdmin',
}

type WorkspaceMobileHeaderProps = {
    role: WorkspaceRole
}

export function WorkspaceMobileHeader({ role }: WorkspaceMobileHeaderProps) {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!isMenuOpen) return

        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsMenuOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false)
        }

        document.addEventListener('pointerdown', closeOnOutsidePointer)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [isMenuOpen])

    return (
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-primary-foreground/10 bg-hero-overlay px-4 text-primary-foreground md:hidden">
            <Link to={ROUTES.home} className="flex shrink-0 items-center" aria-label="AutoCare Hub">
                <BrandLogo size="md" />
            </Link>

            <div ref={menuRef} className="relative flex min-w-0 items-center gap-2">
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
                <button
                    type="button"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('common.menu')}
                    aria-expanded={isMenuOpen}
                    aria-controls="workspace-mobile-menu"
                    onClick={() => setIsMenuOpen((value) => !value)}
                >
                    {isMenuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
                </button>
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
                {isMenuOpen && <WorkspaceMobileMenu role={role} onClose={() => setIsMenuOpen(false)} />}
            </div>
        </header>
    )
}
