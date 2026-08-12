import { NavLink, useLocation } from 'react-router'
import { Bookmark, Building2, Calendar, FileText, HelpCircle, Home, Menu, MessageSquare, MoreHorizontal, Plus, Search, ShieldAlert, ShieldCheck, User, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { useGetMeQuery } from '@/features/auth'
import { getBottomNavPrimaryTarget } from '../model/get-bottom-nav-primary-target'

type BottomNavItem = {
    id: string
    icon: LucideIcon
    label: string
    to: string
    isActive: boolean
    isPrimary?: boolean
}

const adminPrimaryNavItems = [
    { labelKey: 'navigation.adminDashboard', to: ROUTES.adminDashboard, icon: Home },
    { labelKey: 'navigation.adminUsers', to: ROUTES.adminUsers, icon: Users },
    { labelKey: 'navigation.adminCabinets', to: ROUTES.adminCabinets, icon: Building2 },
] as const

const adminSecondaryNavItems = [
    { labelKey: 'navigation.home', to: ROUTES.home, icon: Home },
    { labelKey: 'navigation.adminOwners', to: ROUTES.adminOwners, icon: ShieldCheck },
    { labelKey: 'navigation.adminReviews', to: ROUTES.adminReviews, icon: MessageSquare },
    { labelKey: 'navigation.adminAuditLogs', to: ROUTES.adminAuditLogs, icon: FileText },
    { labelKey: 'navigation.adminSecurityCenter', to: ROUTES.adminSecurityCenter, icon: ShieldAlert },
    { labelKey: 'navigation.profile', to: ROUTES.profile, icon: User },
    { labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle },
] as const

function isNavItemActive(pathname: string, to: string) {
    return to === ROUTES.home
        ? pathname === to
        : pathname === to || pathname.startsWith(`${to}/`)
}

function AdminBottomNav() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const [isMoreOpen, setIsMoreOpen] = useState(false)
    const moreMenuRef = useRef<HTMLDivElement | null>(null)

    const isSecondaryRouteActive = adminSecondaryNavItems.some(({ to }) => isNavItemActive(pathname, to))

    useEffect(() => {
        if (!isMoreOpen) return

        const handlePointerDown = (event: PointerEvent) => {
            if (event.target instanceof Node && !moreMenuRef.current?.contains(event.target)) {
                setIsMoreOpen(false)
            }
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMoreOpen(false)
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isMoreOpen])

    return (
        <nav aria-label={`${t('navigation.adminWorkspace')}, ${t('navigation.mainNavigation')}`} className="fixed inset-x-0 bottom-0 z-[1000] border-t bg-background/95 px-2 pt-2 backdrop-blur-md md:hidden">
            <div ref={moreMenuRef} className="relative mx-auto flex max-w-lg items-stretch gap-1 pb-safe">
                {adminPrimaryNavItems.map(({ icon: Icon, labelKey, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => cn(
                            'flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[11px] leading-tight transition-colors',
                            isActive ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <Icon className="mb-1 size-5" />
                        <span className="max-w-full whitespace-normal break-words">{t(labelKey)}</span>
                    </NavLink>
                ))}
                <button
                    type="button"
                    className={cn(
                        'flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center text-[11px] leading-tight transition-colors',
                        isSecondaryRouteActive ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    aria-expanded={isMoreOpen}
                    aria-controls="admin-mobile-more-menu"
                    aria-haspopup="menu"
                    onClick={() => setIsMoreOpen((value) => !value)}
                >
                    {isMoreOpen ? <X className="mb-1 size-5" /> : <MoreHorizontal className="mb-1 size-5" />}
                    <span>{t('common.more')}</span>
                </button>

                {isMoreOpen && (
                    <div id="admin-mobile-more-menu" role="menu" className="absolute bottom-full left-0 right-0 mb-2 grid grid-cols-2 gap-1 rounded-lg border bg-popover p-2 shadow-xl">
                        {adminSecondaryNavItems.map(({ icon: Icon, labelKey, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                role="menuitem"
                                onClick={() => setIsMoreOpen(false)}
                                className={({ isActive }) => cn(
                                    'flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors',
                                    isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                <span className="min-w-0 truncate">{t(labelKey)}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    )
}

function OwnerBottomNav() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const [isMoreOpen, setIsMoreOpen] = useState(false)

    useEffect(() => {
        if (!isMoreOpen) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMoreOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMoreOpen])

    const links = [
        {
            id: 'dashboard',
            icon: Home,
            label: t('navigation.ownerDashboardShort'),
            to: ROUTES.ownerDashboard,
            isActive: pathname === ROUTES.ownerDashboard,
        },
        {
            id: 'bookings',
            icon: Calendar,
            label: t('navigation.ownerBookings'),
            to: ROUTES.ownerBookings,
            isActive: pathname.startsWith(ROUTES.ownerBookings),
        },
        {
            id: 'calendar',
            icon: Calendar,
            label: t('navigation.ownerCalendar'),
            to: ROUTES.ownerBookings,
            isActive: pathname.startsWith(ROUTES.ownerBookings),
        },
    ]

    const moreLinks = [
        { to: ROUTES.ownerCabinets, label: t('navigation.ownerCabinets') },
        { to: ROUTES.ownerCabinetCreate, label: t('cabinet.form.createTitle') },
        { to: ROUTES.ownerServices, label: t('navigation.ownerServices') },
        { to: ROUTES.ownerClients, label: t('navigation.ownerClients') },
        { to: ROUTES.profile, label: t('navigation.profile') },
        { to: ROUTES.help, label: t('landing.footerHelpCenter') },
    ]

    return (
        <nav aria-label={t('navigation.mainNavigation')} className="fixed bottom-0 left-0 right-0 z-[1000] border-t bg-background/95 px-2 pb-safe pt-2 shadow-lg shadow-foreground/5 backdrop-blur-md md:hidden">
            {isMoreOpen && (
                <div id="owner-more-menu" className="absolute bottom-[calc(100%+0.75rem)] right-3 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border bg-popover p-2 shadow-xl" role="menu" aria-label={t('common.more')}>
                    <div className="flex items-center justify-between border-b px-3 pb-2 pt-1">
                        <p className="text-sm font-semibold">{t('common.more')}</p>
                        <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t('common.close')}
                            onClick={() => setIsMoreOpen(false)}
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="grid gap-1 pt-2">
                        {moreLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                role="menuitem"
                                onClick={() => setIsMoreOpen(false)}
                                className={({ isActive }) => cn(
                                    'rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                                    isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
                                )}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid h-16 grid-cols-4 items-center">
                {links.map((item) => {
                    const Icon = item.icon

                    return (
                        <NavLink
                            key={item.id}
                            to={item.to}
                            aria-label={item.label}
                            className={cn(
                                'flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors',
                                item.isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-5" strokeWidth={item.isActive ? 2.5 : 2} />
                            <span className="max-w-full truncate">{item.label}</span>
                        </NavLink>
                    )
                })}

                <button
                    type="button"
                    className={cn(
                        'flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors',
                        isMoreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label={t('common.more')}
                    aria-expanded={isMoreOpen}
                    aria-controls="owner-more-menu"
                    onClick={() => setIsMoreOpen((value) => !value)}
                >
                    {isMoreOpen ? <Menu className="size-5" /> : <MoreHorizontal className="size-5" />}
                    <span>{t('common.more')}</span>
                </button>
            </div>
        </nav>
    )
}

export function BottomNav() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const { data: user } = useGetMeQuery()

    if (user?.role === 'owner') {
        return <OwnerBottomNav />
    }

    if (user?.role === 'admin' || user?.role === 'super_admin') {
        return <AdminBottomNav />
    }

    const primaryTarget = getBottomNavPrimaryTarget(user?.role)

    const isGuest = !user
    const isClient = user?.role === 'client'
    const navItems: BottomNavItem[] = isGuest
        ? [
            {
                id: 'home',
                icon: Home,
                label: t('navigation.home'),
                to: ROUTES.home,
                isActive: pathname === ROUTES.home,
            },
            {
                id: 'search',
                icon: Search,
                label: t('navigation.cabinets'),
                to: ROUTES.cabinets,
                isActive: pathname.startsWith(ROUTES.cabinets),
            },
            {
                id: 'saved',
                icon: Bookmark,
                label: t('landing.mobileSavedLabel'),
                to: ROUTES.favorites,
                isActive: pathname.startsWith(ROUTES.favorites),
            },
            {
                id: 'account',
                icon: User,
                label: t('auth.signIn'),
                to: ROUTES.login,
                isActive: pathname.startsWith(ROUTES.login),
            },
        ]
        : isClient
            ? [
                {
                    id: 'home',
                    icon: Home,
                    label: t('navigation.home'),
                    to: ROUTES.home,
                    isActive: pathname === ROUTES.home,
                },
                {
                    id: 'search',
                    icon: Search,
                    label: t('navigation.cabinets'),
                    to: ROUTES.cabinets,
                    isActive: pathname.startsWith(ROUTES.cabinets),
                },
                {
                    id: 'bookings',
                    icon: Calendar,
                    label: t('navigation.myBookings'),
                    to: ROUTES.profileBookings,
                    isActive: pathname.startsWith(ROUTES.profileBookings),
                },
                {
                    id: 'saved',
                    icon: Bookmark,
                    label: t('navigation.favorites'),
                    to: ROUTES.favorites,
                    isActive: pathname.startsWith(ROUTES.favorites),
                },
                {
                    id: 'account',
                    icon: User,
                    label: t('navigation.profile'),
                    to: ROUTES.profile,
                    isActive: pathname.startsWith(ROUTES.profile),
                },
            ]
            : [
                {
                    id: 'home',
                    icon: Home,
                    label: t('navigation.home'),
                    to: ROUTES.home,
                    isActive: pathname === ROUTES.home,
                },
                {
                    id: 'cabinets',
                    icon: Search,
                    label: t('navigation.cabinets'),
                    to: ROUTES.cabinets,
                    isActive: pathname.startsWith(ROUTES.cabinets),
                },
                {
                    id: 'primary',
                    icon: Plus,
                    label: t(primaryTarget.labelKey),
                    to: primaryTarget.to,
                    isPrimary: true,
                    isActive: false,
                },
                {
                    id: 'bookings',
                    icon: Calendar,
                    label: t('navigation.ownerBookings'),
                    to: ROUTES.adminDashboard,
                    isActive: pathname.includes('bookings'),
                },
                {
                    id: 'profile',
                    icon: User,
                    label: t('navigation.profile'),
                    to: ROUTES.profile,
                    isActive: pathname.startsWith(ROUTES.profile) || pathname.includes('owner/dashboard'),
                },
            ]

    return (
        <nav aria-label={t('navigation.mainNavigation')} className="fixed bottom-0 left-0 right-0 z-[1000] border-t bg-background/95 px-2 pb-safe pt-2 shadow-lg shadow-foreground/5 backdrop-blur-md md:hidden">
            <div className="flex h-16 items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon

                    if (item.isPrimary) {
                        return (
                            <NavLink
                                key={item.id}
                                to={item.to}
                                aria-label={item.label}
                                className="group relative -top-5 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
                            >
                                <Icon className="size-6 transition-transform group-hover:rotate-90" />
                            </NavLink>
                        )
                    }

                    return (
                        <NavLink
                            key={item.id}
                            to={item.to}
                            aria-label={item.label}
                            className={cn(
                                'flex min-w-[64px] flex-col items-center justify-center gap-1 transition-colors',
                                item.isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className={cn('size-6', item.isActive && 'fill-primary/20')} strokeWidth={item.isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium leading-none">
                                {item.label}
                            </span>
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
