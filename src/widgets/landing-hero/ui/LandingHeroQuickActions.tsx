import { Link } from 'react-router'
import { Search, Calendar, Heart, User } from 'lucide-react'
import { ROUTES } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { useTranslation } from '@/shared/lib/useTranslation'

export function LandingHeroQuickActions() {
    const { data: user } = useGetMeQuery()
    const { t } = useTranslation()

    const actions = [
        { id: 'search', label: t('navigation.services'), icon: Search, to: ROUTES.serviceDiscovery },
        { id: 'bookings', label: t('landing.categoryBookings'), icon: Calendar, to: user?.role === 'owner' ? ROUTES.ownerBookings : ROUTES.profileBookings },
        { id: 'favorites', label: t('landing.categoryFavorites'), icon: Heart, to: ROUTES.profile },
        { id: 'owners', label: t('landing.categoryOwners'), icon: User, to: ROUTES.register },
    ]

    return (
        <div className="autocarehub-motion-fade-up grid grid-cols-2 gap-3 mt-4"
        >
            {actions.map((action) => {
                const Icon = action.icon
                return (
                    <Link
                        key={action.id}
                        to={action.to}
                        className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 shadow-sm active:scale-95 transition-all"
                    >
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-6" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-semibold text-center">{action.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}
