import { Battery, CircleGauge, Disc3, LocateFixed, ScanSearch, ShieldCheck, Truck, Zap } from 'lucide-react'
import { Link } from 'react-router'

import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

const services = [
    { id: 'maintenance', icon: Disc3 },
    { id: 'diagnostics', icon: ScanSearch },
    { id: 'tow-truck', icon: Truck },
    { id: 'mobile-diagnostics', icon: LocateFixed },
    { id: 'tire-service', icon: CircleGauge },
    { id: 'electric', icon: Zap },
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
            <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-7">
                {services.map((service) => {
                    const catalogService = automotiveServices.find((item) => item.id === service.id)
                    if (!catalogService) return null

                    return (
                        <Link key={service.id} to={`${ROUTES.serviceDiscovery}?service=${service.id}`} className="group text-center">
                            <span className="mx-auto flex size-14 items-center justify-center rounded-[9px] bg-secondary/55 text-primary"><service.icon className="size-8 stroke-[1.8]" /></span>
                            <span className="mt-2 block text-[0.7rem] font-semibold leading-[1.25] group-hover:text-primary">{getServiceLabel(catalogService, locale)}</span>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
