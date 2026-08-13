import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import {
    CurrentUserMenu,
    useGetMeQuery,
} from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { isProviderPricingVisible } from '@/shared/config/features'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ThemeSwitcher } from '@/widgets/theme-switcher'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher'

export function AppHeader() {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!isMenuOpen) return

        const handlePointerDown = (event: PointerEvent) => {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isMenuOpen])

    const primaryLinks = [
        { to: ROUTES.serviceDiscovery, label: t('navigation.services') },
        { to: ROUTES.owners, label: t('navigation.owners') },
        ...(isProviderPricingVisible ? [{ to: ROUTES.pricing, label: t('navigation.pricing') }] : []),
        { to: ROUTES.help, label: t('landing.footerHelpCenter') },
    ]
    const secondaryLinks = [
        { to: ROUTES.home, label: t('navigation.home'), end: true },
        { to: ROUTES.features, label: t('navigation.features') },
        { to: ROUTES.about, label: t('navigation.about') },
        { to: ROUTES.blog, label: t('landing.footerBlog') },
    ]

    return (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
                <Link to={ROUTES.home} className="flex shrink-0 items-center" aria-label="AutoCare Hub">
                    <BrandLogo size="sm" />
                </Link>

                <div className="relative flex items-center gap-2" ref={menuRef}>
                    {user && <CurrentUserMenu user={user} />}
                    <ThemeSwitcher />
                    <button
                        type="button"
                        className="flex size-10 items-center justify-center rounded-md border bg-card text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                        aria-label={t('common.menu')}
                        aria-expanded={isMenuOpen}
                        aria-controls="public-mobile-menu"
                        data-testid="mobile-home-menu"
                        onClick={() => setIsMenuOpen((value) => !value)}
                    >
                        {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>

                    {isMenuOpen && (
                        <div id="public-mobile-menu" className="absolute right-0 top-12 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-lg border bg-popover p-2 shadow-xl">
                            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm font-semibold text-muted-foreground">
                                <span>{t('common.language')}</span>
                                <LanguageSwitcher />
                            </div>
                            <nav className="grid gap-1 pt-2" aria-label={t('navigation.mainNavigation')}>
                                {[...primaryLinks, ...secondaryLinks].map((link, index) => (
                                    <NavLink
                                        key={link.to}
                                        to={link.to}
                                        {...('end' in link ? { end: link.end } : {})}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={({ isActive }) => `rounded-md px-3 py-3 text-sm font-semibold transition-colors ${index === primaryLinks.length ? 'mt-1 border-t pt-3' : ''} ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                    >
                                        <span className="flex items-center justify-between gap-3">
                                            {link.label}
                                            <ChevronDown className="size-3.5 -rotate-90 text-muted-foreground" aria-hidden="true" />
                                        </span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
