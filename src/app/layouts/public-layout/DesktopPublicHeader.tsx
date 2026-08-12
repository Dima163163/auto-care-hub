import { ChevronDown, Heart, MapPin, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import {
    CurrentUserBadge,
    getAccountLinkTranslationKey,
    getDefaultRouteByRole,
    useGetMeQuery,
} from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'

export function DesktopPublicHeader() {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()
    const links = [
        { label: t('navigation.services'), to: ROUTES.serviceDiscovery },
        { label: t('navigation.myBookings'), to: ROUTES.profileBookings },
        { label: t('navigation.favorites'), to: ROUTES.favorites },
        { label: t('navigation.owners'), to: ROUTES.owners },
        { label: t('navigation.about'), to: ROUTES.about },
    ]

    return (
        <header className="relative z-50 hidden h-[84px] shrink-0 border-b border-primary-foreground/10 bg-hero-overlay text-primary-foreground md:block">
            <div className="mx-auto flex h-full max-w-[1416px] items-center px-[clamp(1.5rem,3.2vw,3.5rem)]">
                <Link to={ROUTES.home} className="shrink-0" aria-label={t('navigation.home')}>
                    <BrandLogo size="lg" />
                </Link>
                <nav className="ml-auto hidden h-full items-center gap-[clamp(1.5rem,3vw,3.1rem)] whitespace-nowrap text-sm font-semibold lg:flex">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className="flex h-full items-center text-primary-foreground/90 transition-colors hover:text-primary-foreground"
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="ml-auto flex items-center gap-5">
                    <Link
                        to={ROUTES.serviceDiscovery}
                        className="flex h-[45px] items-center gap-2 rounded-[9px] border border-primary-foreground/20 px-4 text-sm font-semibold"
                    >
                        <MapPin className="size-[19px]" />Москва<ChevronDown className="size-4" />
                    </Link>
                    <Link to={ROUTES.favorites} aria-label={t('navigation.favorites')}>
                        <Heart className="size-7 stroke-[1.7]" />
                    </Link>
                    {isLoading ? <CurrentUserBadge isLoading /> : null}
                    {!isLoading && (isError || !user) ? (
                        <Link
                            to={ROUTES.login}
                            className="inline-flex h-[45px] items-center gap-2 rounded-[9px] border border-primary-foreground/25 px-4 text-sm font-bold"
                        >
                            <UserRound className="size-[19px]" />{t('auth.signIn')}
                        </Link>
                    ) : null}
                    {!isLoading && user ? (
                        <Link to={getDefaultRouteByRole(user.role)}>
                            <CurrentUserBadge user={user} compactAtTablet />
                            <span className="sr-only">{t(getAccountLinkTranslationKey(user.role))}</span>
                        </Link>
                    ) : null}
                </div>
            </div>
        </header>
    )
}
