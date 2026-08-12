import { Check, Clock3 } from 'lucide-react'
import { Link } from 'react-router'

import type { ProviderProfile } from '@/entities/automotive-service'
import { getServiceLabel, automotiveServices } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { routePaths } from '@/shared/constants/routes'

export function ProviderOfferings({ provider }: { provider: ProviderProfile }) {
    const { t, locale } = useTranslation()

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-primary">{t('autocare.providerProfile')}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">{t('autocare.providerServices')}</h2></div><span className="text-xs font-semibold text-muted-foreground">{provider.offerings.length} {t('autocare.providerServices').toLowerCase()}</span></div><div className="mt-5 divide-y divide-border">{provider.offerings.map((offering) => { const service = automotiveServices.find((item) => item.id === offering.serviceId); return <div key={offering.serviceId} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><h3 className="font-bold text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{offering.duration}</span><span>{offering.availability}</span></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{offering.includes.map((item) => <span key={item} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Check className="size-3.5 text-status-success-foreground" />{item}</span>)}</div></div><div className="text-left sm:text-right"><p className="text-lg font-black text-foreground">{offering.priceLabel}</p><Link to={routePaths.serviceRequest(provider.id, offering.serviceId)} className="mt-2 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90">{t('autocare.bookAction')}</Link></div></div> })}</div></section>
}
