import { Link } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { Search } from 'lucide-react'
import { LandingHeroQuickActions } from './LandingHeroQuickActions'
import { useTranslation } from '@/shared/lib/useTranslation'

export function MobileHero() {
    const { t } = useTranslation()

    return (
        <div className="md:hidden pt-6 pb-2 flex flex-col gap-6">
            <div className="autocarehub-motion-fade-down flex items-center gap-2"
            >
                <h1 className="text-3xl font-bold tracking-tight">
                    {t('landing.mobileWelcome')} 👋
                </h1>
            </div>

            <p className="autocarehub-motion-fade-in text-muted-foreground text-base"
            >
                {t('landing.mobileSubtitle')}
            </p>

            <div className="autocarehub-motion-fade-up relative"
            >
                <Link to={ROUTES.serviceDiscovery} className="block w-full">
                    <div className="flex h-14 w-full items-center gap-3 rounded-xl border bg-card px-5 text-base text-muted-foreground shadow-sm ring-1 ring-inset ring-border/50">
                        <Search className="size-5" />
                        <span>{t('landing.mobileSearchPlaceholder')}</span>
                    </div>
                </Link>
            </div>

            <LandingHeroQuickActions />
        </div>
    )
}
