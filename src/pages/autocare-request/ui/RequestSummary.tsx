import { CheckCircle2, Clock3, MapPin } from 'lucide-react'

import type { ProviderProfile, ProviderOffering } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

export function RequestSummary({ provider, offering }: { provider: ProviderProfile; offering: ProviderOffering }) {
    const { t, locale } = useTranslation()
    const service = automotiveServices.find((item) => item.id === offering.serviceId)

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex gap-4"><AutoCareImage src={provider.image} alt={provider.name} className="size-20 shrink-0 rounded-[var(--radius-control)] object-cover sm:size-24" /><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('autocare.requestSelectedProvider')}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">{provider.name}</h1><p className="mt-1 text-sm font-medium text-muted-foreground">{provider.address}</p></div></div><div className="mt-5 grid gap-3 text-sm font-semibold text-muted-foreground sm:grid-cols-3"><span className="inline-flex items-center gap-2"><MapPin className="size-4 text-primary" />{provider.distance}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-primary" />{provider.nextSlot}</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-status-success-foreground" />{provider.verified ? t('autocare.trustedBadge') : t('autocare.detailsAction')}</span></div><div className="mt-5 grid gap-3 rounded-[var(--radius-card)] bg-secondary p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-xs font-bold text-muted-foreground">{t('autocare.requestSelectedService')}</p><p className="mt-1 font-black text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{offering.duration} · {offering.includes.join(' · ')}</p></div><p className="text-xl font-black text-foreground">{offering.priceLabel}</p></div></section>
}
