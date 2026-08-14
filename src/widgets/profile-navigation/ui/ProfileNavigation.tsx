import {
    Bell,
    CarFront,
    CalendarDays,
    Heart,
    Home,
    LayoutDashboard,
    MessageSquare,
    UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type ProfileNavigationProps = {
    desktopHidden?: boolean
}

export function ProfileNavigation({ desktopHidden = true }: ProfileNavigationProps) {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()

    const links = [
        { to: ROUTES.home, label: t('navigation.home'), icon: Home, end: true },
        { to: ROUTES.profile, label: t('navigation.profile'), icon: UserRound, end: true },
        ...(user?.role === 'client'
            ? [
                  { to: ROUTES.profileBookings, label: t('navigation.myBookings'), icon: CalendarDays },
                  { to: ROUTES.chats, label: t('navigation.chats'), icon: MessageSquare },
                  { to: ROUTES.profileVehicles, label: t('navigation.myVehicles'), icon: CarFront },
                  { to: ROUTES.profileReviews, label: t('navigation.myReviews'), icon: MessageSquare },
                  { to: ROUTES.favorites, label: t('navigation.favorites'), icon: Heart },
                  { to: ROUTES.notifications, label: t('navigation.notifications'), icon: Bell },
              ]
            : []),
        ...(user?.role === 'owner'
            ? [{ to: ROUTES.ownerDashboard, label: t('navigation.ownerDashboard'), icon: LayoutDashboard }]
            : []),
        ...(user?.role === 'admin' || user?.role === 'super_admin'
            ? [{ to: ROUTES.adminDashboard, label: t('navigation.adminDashboard'), icon: LayoutDashboard }]
            : []),
    ]

    return (
        <nav data-testid="profile-navigation" aria-label={t('navigation.profileWorkspace')} className={`${desktopHidden ? 'md:hidden' : ''} hidden -mx-1 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:overflow-visible md:px-0`}>
            <div className="flex min-w-max gap-2 md:min-w-0 md:flex-col">
                {links.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        {...(end === undefined ? {} : { end })}
                        className={({ isActive }) => `flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors lg:w-full ${
                            isActive
                            ? 'bg-primary/10 text-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <Icon className="size-4 shrink-0" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
