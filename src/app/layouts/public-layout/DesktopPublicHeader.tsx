import { ChevronDown, Heart, MapPin, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import { CurrentUserBadge, CurrentUserMenu, useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher'
import { ThemeSwitcher } from '@/widgets/theme-switcher'
import { HeaderInfoMenu } from '@/widgets/header-info-menu'

export function DesktopPublicHeader() {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()
    return (
        <header className="sticky top-0 z-50 hidden h-[84px] shrink-0 border-b border-primary-foreground/10 bg-hero-overlay/95 text-primary-foreground backdrop-blur-md md:block">
            <div className="mx-auto flex h-full max-w-[1416px] items-center px-[clamp(1.5rem,3.2vw,3.5rem)]">
                <Link to={ROUTES.home} className="shrink-0" aria-label={t('navigation.home')}>
                    <BrandLogo size="lg" />
                </Link>
                <nav className="ml-auto hidden h-full items-center gap-[clamp(1rem,2.25vw,2.6rem)] whitespace-nowrap text-sm font-semibold lg:flex">
                    <NavLink to={ROUTES.serviceDiscovery} className="flex h-full items-center text-primary-foreground/90 transition-colors hover:text-primary-foreground">
                        {t('navigation.services')}
                    </NavLink>
                    <NavLink to={ROUTES.platformReviews} className="flex h-full items-center text-primary-foreground/90 transition-colors hover:text-primary-foreground">
                        {t('autocare.footerReviews')}
                    </NavLink>
                    <HeaderInfoMenu variant="dark" />
                </nav>
                <div className="ml-auto flex items-center gap-3 xl:gap-4">
                    <Link
                        to={ROUTES.serviceDiscovery}
                        className="flex h-10 items-center gap-1.5 rounded-[9px] border border-primary-foreground/20 px-2.5 text-xs font-semibold xl:px-3"
                    >
                        <MapPin className="size-4" />
                        <span className="hidden xl:inline">Москва</span>
                        <ChevronDown className="size-3.5" />
                    </Link>
                    <LanguageSwitcher compact />
                    <ThemeSwitcher />
                    {!isLoading && !user && (
                        <Link to={ROUTES.favorites} aria-label={t('navigation.favorites')}>
                            <Heart className="size-7 stroke-[1.7]" />
                        </Link>
                    )}
                    {isLoading ? <CurrentUserBadge isLoading /> : null}
                    {!isLoading && (isError || !user) ? (
                        <Link
                            to={ROUTES.login}
                            className="inline-flex h-[45px] items-center gap-2 rounded-[9px] border border-primary-foreground/25 px-4 text-sm font-bold"
                        >
                            <UserRound className="size-[19px]" />{t('auth.signIn')}
                        </Link>
                    ) : null}
                    {!isLoading && user ? <CurrentUserMenu user={user} variant="dark" /> : null}
                </div>
            </div>
        </header>
    )
}
