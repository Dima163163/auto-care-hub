import { useGetCabinetsQuery } from '@/entities/cabinet'
import { FavoriteCabinetCard } from '@/features/favorites'
import { Link } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ArrowRight } from 'lucide-react'

export function PopularCabinets() {
    const { t } = useTranslation()
    const { data, isLoading } = useGetCabinetsQuery({ limit: 4, sortBy: 'newest' })

    const cabinets = data?.items || []

    if (isLoading || cabinets.length === 0) return null

    return (
        <section className="px-4 py-8 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                        {t('landing.popularCabinets')}
                    </h2>
                    
                    <Link 
                        to={ROUTES.cabinets}
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                        {t('landing.viewAll')}
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                {/* Mobile: Swipeable Carousel, Desktop: Grid */}
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 md:grid md:grid-cols-4 md:snap-none md:overflow-visible md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    {cabinets.map(cabinet => (
                        <div key={cabinet.id} className="w-[85vw] shrink-0 snap-center md:w-auto md:shrink">
                            <FavoriteCabinetCard cabinet={cabinet} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
