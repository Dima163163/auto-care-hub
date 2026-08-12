import { Link } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'

export function LandingHeroCategories() {
    const { t, locale } = useTranslation()
    const categories = automotiveServices.slice(0, 5).map((service) => ({
        id: service.id,
        label: getServiceLabel(service, locale),
        icon: service.icon,
        to: `${ROUTES.serviceDiscovery}?service=${encodeURIComponent(service.id)}`,
    }))

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold tracking-tight mb-4">{t('landing.categoriesTitle')}</h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 scrollbar-hide pb-2 -mx-4 px-4">
                {categories.map((cat) => (
                    <Link
                        key={cat.id}
                        to={cat.to}
                        className="flex shrink-0 snap-start items-center gap-2 rounded-full border bg-card/60 px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted active:scale-95"
                    >
                        <span className="text-base">{cat.icon}</span>
                        <span>{cat.label}</span>
                    </Link>
                ))}
                <Link
                    to={ROUTES.serviceDiscovery}
                    className="flex shrink-0 snap-start items-center gap-2 rounded-full border bg-card/60 px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted active:scale-95"
                >
                    <MoreHorizontal className="size-4 text-muted-foreground" />
                    <span>{t('landing.categoryMore')}</span>
                </Link>
            </div>
        </div>
    )
}
