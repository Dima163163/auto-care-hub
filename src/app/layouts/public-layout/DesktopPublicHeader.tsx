import { ChevronDown, Heart, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'

import { CurrentUserBadge, CurrentUserMenu, useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher'
import { ThemeSwitcher } from '@/widgets/theme-switcher'
import { HeaderInfoMenu, headerInfoLinks } from '@/widgets/header-info-menu'
import { MarketSwitcher } from '@/widgets/market-switcher'

export function DesktopPublicHeader() {
    const { t } = useTranslation()
    const { data: user, isLoading, isError } = useGetMeQuery()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!isMobileMenuOpen) return

        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
                setIsMobileMenuOpen(false)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMobileMenuOpen(false)
        }

        document.addEventListener('pointerdown', closeOnOutsidePointer)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [isMobileMenuOpen])

    const mobileLinks = [
        { to: ROUTES.serviceDiscovery, label: t('navigation.services'), end: false },
        { to: ROUTES.home, label: t('navigation.home'), end: true },
        { to: ROUTES.features, label: t('navigation.features'), end: false },
        { to: ROUTES.platformReviews, label: t('autocare.footerReviews'), end: false },
        { to: ROUTES.blog, label: t('landing.footerBlog'), end: false },
    ]

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
                <div ref={menuRef} className="relative ml-auto flex items-center gap-3 xl:gap-4">
                    <MarketSwitcher compact />
                    <LanguageSwitcher compact />
                    <ThemeSwitcher />
                    <button
                        type="button"
                        className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground transition-colors hover:border-primary hover:bg-primary-foreground/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                        aria-label={t('common.menu')}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="desktop-public-mobile-menu"
                        data-testid="desktop-public-mobile-menu-trigger"
                        onClick={() => setIsMobileMenuOpen((value) => !value)}
                    >
                        {isMobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                    </button>
                    {!isLoading && !user && (
                        <Link to={ROUTES.favorites} aria-label={t('navigation.favorites')}>
                            <Heart className="size-7 stroke-[1.7]" />
                        </Link>
                    )}
                    {isLoading ? <CurrentUserBadge isLoading variant="dark" /> : null}
                    {!isLoading && (isError || !user) ? (
                        <Link
                            to={ROUTES.login}
                            className="inline-flex h-[45px] items-center gap-2 rounded-[9px] border border-primary-foreground/25 px-4 text-sm font-bold"
                        >
                            <UserRound className="size-[19px]" />{t('auth.signIn')}
                        </Link>
                    ) : null}
                    {!isLoading && user ? <CurrentUserMenu user={user} variant="dark" /> : null}

                    {isMobileMenuOpen && (
                        <div id="desktop-public-mobile-menu" className="absolute right-0 top-[calc(100%+0.6rem)] z-[70] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/30 lg:hidden">
                            <nav className="grid gap-1" aria-label={t('navigation.mainNavigation')}>
                                {mobileLinks.map((link, index) => (
                                    <NavLink
                                        key={link.to}
                                        to={link.to}
                                        end={link.end}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) => `rounded-lg px-3 py-3 text-sm font-bold transition-colors ${index === 1 ? 'mt-1 border-t border-border pt-3' : ''} ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                    >
                                        <span className="flex items-center justify-between gap-3">
                                            {link.label}
                                            <ChevronDown className="size-3.5 -rotate-90 text-muted-foreground" aria-hidden="true" />
                                        </span>
                                    </NavLink>
                                ))}
                            </nav>
                            <div className="mt-2 border-t border-border pt-2">
                                <p className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{t('navigation.helpAndInfo')}</p>
                                {headerInfoLinks.map(({ to, labelKey, descriptionKey, icon: Icon }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
                                    >
                                        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                        <span>
                                            <span className="block">{t(labelKey)}</span>
                                            <span className="block text-xs font-medium text-muted-foreground">{t(descriptionKey)}</span>
                                        </span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
