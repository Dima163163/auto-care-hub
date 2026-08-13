import { Link, Outlet } from 'react-router'

import { APP_CONFIG } from '@/shared/config/app'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ThemeSwitcher } from '@/widgets/theme-switcher'
import { BrandLogo } from '@/shared/ui/brand-logo'

export function AuthLayout() {
    const { t } = useTranslation()

    return (
        <div className="autocare-app-surface min-h-screen bg-muted/30 px-4 py-6 lg:px-8 lg:py-8">
            <div className="fixed right-4 top-4 z-20">
                <ThemeSwitcher />
            </div>

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
                <div className="grid w-full overflow-hidden rounded-xl border bg-card shadow-xl shadow-foreground/10 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="relative hidden min-h-[680px] overflow-hidden bg-primary/10 lg:block">
                        <img
                            src="/images/autocare/owners/workshop-hero.png"
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-hero-overlay/80 via-hero-overlay/10 to-transparent" />
                        <div className="absolute inset-x-8 bottom-8 text-white">
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">
                                {APP_CONFIG.name}
                            </p>
                            <p className="mt-3 max-w-sm text-2xl font-semibold leading-tight">
                                {t('landing.title')}
                            </p>
                        </div>
                    </div>

                    <div className="flex min-h-[680px] items-center bg-background px-6 py-10 sm:px-12 lg:px-16">
                        <div className="w-full max-w-md">
                            <Link to={ROUTES.home} className="mb-8 flex items-center gap-2 text-foreground">
                                <BrandLogo size="sm" />
                            </Link>
                            <Outlet />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
