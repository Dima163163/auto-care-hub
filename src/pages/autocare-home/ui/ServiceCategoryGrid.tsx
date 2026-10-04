import { Battery, CircleGauge, Disc3, LocateFixed, ScanSearch, ShieldCheck, Truck, Zap } from 'lucide-react'
import { Link } from 'react-router'

import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

const services = [
    { id: 'maintenance', icon: Disc3 },
    { id: 'diagnostics', icon: ScanSearch },
    { id: 'tire-service', icon: CircleGauge },
    { id: 'electric', icon: Zap },
    { id: 'tow-truck', icon: Truck },
    { id: 'mobile-diagnostics', icon: LocateFixed },
    { id: 'roadside-assistance', icon: ShieldCheck },
    { id: 'battery-service', icon: Battery },
] as const

export function ServiceCategoryGrid() {
    const { t, locale } = useTranslation()

    return (
        <section className="h-full rounded-[10px] bg-card p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">{t('autocare.popularServices')}</h2>
                <Link to={ROUTES.serviceDiscovery} className="text-xs font-semibold text-primary">{t('autocare.allServices')}</Link>
            </div>
            {[services.slice(0, 4), services.slice(4)].map((group, index) => (
                <div key={index} className="mt-5">
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t(index === 0 ? 'autocare.workshopServices' : 'autocare.roadsideServices')}</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {group.map((service) => {
                            const catalogService = automotiveServices.find((item) => item.id === service.id)
                            if (!catalogService) return null
                            return <Link key={service.id} to={routePaths.serviceDiscovery({ service: service.id })} className="group flex min-h-32 flex-col items-center gap-3 rounded-[var(--radius-control)] border border-border p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                <service.icon aria-hidden="true" className="size-7 shrink-0 text-primary" />
                                <span className="text-sm font-medium leading-5 group-hover:text-primary">{getServiceLabel(catalogService, locale)}</span>
                            </Link>
                        })}
                    </div>
                </div>
            ))}
        </section>
    )
}
