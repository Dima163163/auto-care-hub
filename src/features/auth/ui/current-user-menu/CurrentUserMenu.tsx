import {
    Bell,
    CarFront,
    Heart,
    LayoutDashboard,
    MessageSquare,
    MapPin,
    Store,
    UserRound,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useGetOwnerAutoCareProvidersQuery, type AutoCareApiProvider } from '@/entities/automotive-service'
import { UserRoleBadge, type User } from '@/entities/user'
import { cn } from '@/lib/utils'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { getAccountLinkTranslationKey } from '../../lib/getAccountLinkTranslationKey'
import { getDefaultRouteByRole } from '../../lib/getDefaultRouteByRole'
import { LogoutButton } from '../logout-button/LogoutButton'

function UserAvatar({ user, size = 'size-full' }: { user: User; size?: string }) {
    const [hasImageError, setHasImageError] = useState(false)
    const showImage = Boolean(user.avatarUrl) && !hasImageError

    return showImage ? (
        <img src={user.avatarUrl!} alt="" onError={() => setHasImageError(true)} className={cn(size, 'rounded-full object-cover')} />
    ) : (
        <span className={cn('flex items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground', size)}>
            {user.name.slice(0, 1).toUpperCase()}
        </span>
    )
}

type CurrentUserMenuProps = {
    user: User
    variant?: 'surface' | 'dark'
    className?: string
}

export function CurrentUserMenu({ user, variant = 'surface', className }: CurrentUserMenuProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const menuId = useId()
    const { data: providers = [] } = useGetOwnerAutoCareProvidersQuery(undefined, { skip: user.role !== 'owner' })

    useEffect(() => {
        if (!isOpen) return

        const handlePointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false)
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const isDark = variant === 'dark'
    const workspaceRoute = getDefaultRouteByRole(user.role)
    const menuLinks = user.role === 'owner'
        ? [
            { to: ROUTES.profile, label: t('auth.accountMenuProfile'), icon: UserRound },
            { to: ROUTES.ownerBookings, label: t('auth.accountMenuRequests'), icon: MessageSquare },
            { to: ROUTES.ownerClients, label: t('auth.accountMenuClients'), icon: Store },
            { to: ROUTES.notifications, label: t('auth.accountMenuNotifications'), icon: Bell },
        ]
        : [
            { to: ROUTES.profile, label: t('auth.accountMenuProfile'), icon: UserRound },
            { to: ROUTES.profileBookings, label: t('auth.accountMenuRequests'), icon: MessageSquare },
            { to: ROUTES.favorites, label: t('auth.accountMenuFavorites'), icon: Heart },
            { to: ROUTES.notifications, label: t('auth.accountMenuNotifications'), icon: Bell },
        ]

    return (
        <div ref={containerRef} className={cn('relative shrink-0', className)}>
            <button
                type="button"
                className={cn(
                    'flex size-10 items-center justify-center rounded-full border p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    isDark
                        ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
                )}
                aria-label={t('auth.accountMenuTrigger')}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => setIsOpen((value) => !value)}
            >
                <UserAvatar user={user} />
            </button>

            {isOpen && (
                <div
                    id={menuId}
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.55rem)] z-[70] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/20"
                >
                    <div className="border-b border-border px-3 pb-3 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-black text-primary-foreground">
                                <UserAvatar user={user} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                <UserRoleBadge role={user.role} />
                            </div>
                        </div>
                    </div>

                    {user.role === 'client' ? <VehicleCard onClose={() => setIsOpen(false)} /> : user.role === 'owner' ? <BranchesCard providers={providers} onClose={() => setIsOpen(false)} /> : null}

                    <nav className="mt-2 grid gap-0.5" aria-label={t('auth.accountMenuTitle')}>
                        {menuLinks.map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                            >
                                <Icon className="size-4 text-muted-foreground" />
                                {label}
                            </Link>
                        ))}
                        {workspaceRoute !== ROUTES.profile && (
                            <Link
                                to={workspaceRoute}
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                            >
                                <LayoutDashboard className="size-4 text-muted-foreground" />
                                {t(getAccountLinkTranslationKey(user.role))}
                            </Link>
                        )}
                    </nav>

                    <div className="mt-2 border-t border-border pt-2">
                        <LogoutButton
                            className="h-10 w-full justify-start rounded-xl border-0 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                            variant="ghost"
                            showIcon
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function VehicleCard({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation()
    return <Link to={ROUTES.profile} role="menuitem" onClick={onClose} className="mt-2 flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/[0.06] px-3 py-2.5 transition-colors hover:bg-primary/10"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CarFront className="size-4" /></span><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('auth.accountMenuVehicleTitle')}</span><span className="block truncate text-sm font-bold">{t('autocare.providerVehicleValue')}</span><span className="block truncate text-xs text-muted-foreground">{t('auth.accountMenuVehicleHint')}</span></span></Link>
}

function BranchesCard({ providers, onClose }: { providers: AutoCareApiProvider[]; onClose: () => void }) {
    const { t } = useTranslation()
    return <section className="mt-2 rounded-xl border border-primary/10 bg-primary/[0.06] px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"><Store className="size-3.5 text-primary" />{t('auth.accountMenuBranchesTitle')}</span><Link to={ROUTES.ownerAutoCareProviders} role="menuitem" onClick={onClose} className="text-[11px] font-black text-primary hover:underline">{t('auth.accountMenuAllBranches')}</Link></div>{providers.length > 0 ? <div className="mt-2 grid gap-1">{providers.slice(0, 3).map((provider) => <Link key={provider.id} to={routePaths.ownerAutoCareProviderDetails(provider.id)} role="menuitem" onClick={onClose} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-primary/10"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-primary"><MapPin className="size-3.5" /></span><span className="min-w-0"><span className="block truncate text-xs font-bold">{provider.name}</span><span className="block truncate text-[10px] text-muted-foreground">{provider.location.address}</span></span></Link>)}</div> : <p className="mt-2 text-xs font-medium text-muted-foreground">{t('auth.accountMenuNoBranches')}</p>}</section>
}
