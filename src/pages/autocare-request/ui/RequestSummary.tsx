import { Check, Clock3, MapPin, ShieldCheck } from 'lucide-react'

import type { ProviderOffering, ProviderProfile } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'
import { ServiceWrenchIcon } from '@/shared/ui/icons/service-wrench-icon'

type RequestSelectionProps = {
    provider: ProviderProfile
    offering: ProviderOffering
}

export function RequestSummary({ provider, offering }: RequestSelectionProps) {
    const { t, locale } = useTranslation()
    const service = automotiveServices.find((item) => item.id === offering.serviceId)
    const serviceLabel = service ? getServiceLabel(service, locale) : offering.serviceId

    return (
        <section className="grid overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm md:grid-cols-2">
            <div className="flex gap-3 border-b border-border p-5 md:border-b-0 md:border-r sm:p-6">
                <AutoCareImage src={provider.image} alt={provider.name} className="size-[72px] shrink-0 rounded-[var(--radius-control)] object-cover" />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">{t('autocare.requestSelectedProvider')}</p>
                    <h1 className="mt-1 truncate text-xl font-black tracking-tight text-foreground">{provider.name}</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="size-3.5 text-primary" />{provider.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-status-success-foreground">
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-status-success-surface px-2 py-1"><Clock3 className="size-3.5" />{provider.hours}</span>
                        {provider.verified ? <span className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-status-success-surface px-2 py-1"><Check className="size-3.5" />{t('autocare.trustedBadge')}</span> : null}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 p-5 sm:p-6">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><ServiceWrenchIcon className="size-7" /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">{t('autocare.requestSelectedService')}</p>
                    <h2 className="mt-1 text-sm font-black text-foreground">{serviceLabel}</h2>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{offering.duration}</p>
                </div>
                <p className="shrink-0 text-right text-lg font-black text-foreground">{offering.priceLabel}</p>
            </div>
        </section>
    )
}

export function RequestOrderSummary({ provider, offering }: RequestSelectionProps) {
    const { t, locale } = useTranslation()
    const service = automotiveServices.find((item) => item.id === offering.serviceId)
    const currentDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date())

    return (
        <aside className="h-fit overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm lg:sticky lg:top-5">
            <div className="border-b border-border px-5 py-4">
                <h2 className="text-lg font-black tracking-tight text-foreground">{t('autocare.providerBookingTitle')}</h2>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{t('autocare.providerBookingStep')}</p>
            </div>
            <div className="divide-y divide-border px-5 text-sm">
                <div className="py-4"><p className="text-xs font-bold text-muted-foreground">{t('autocare.requestSelectedService')}</p><p className="mt-1 font-black text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</p><p className="mt-1 text-xs font-bold text-foreground">{offering.priceLabel}</p></div>
                <div className="py-4"><p className="text-xs font-bold text-muted-foreground">{t('autocare.requestSelectedProvider')}</p><p className="mt-1 font-black text-foreground">{provider.name}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{provider.address}</p></div>
                <div className="py-4"><p className="text-xs font-bold text-muted-foreground">{t('autocare.requestDateTimeTitle')}</p><p className="mt-1 font-black text-foreground">{t('autocare.providerToday')}, {currentDate} · 10:00</p></div>
            </div>
            <div className="border-t border-border bg-secondary/45 p-5"><div className="flex items-end justify-between gap-4"><p className="text-lg font-black text-foreground">Итого</p><p className="text-2xl font-black text-foreground">{offering.priceLabel}</p></div><ul className="mt-4 grid gap-2 text-xs font-semibold text-status-success-foreground">{offering.includes.slice(0, 3).map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0" />{item}</li>)}</ul></div>
            <div className="grid gap-3 p-5"><p className="flex gap-2 text-xs font-semibold leading-5 text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" />{t('autocare.requestProviderConfirmation')}</p><p className="text-xs font-medium leading-5 text-muted-foreground">{t('autocare.requestDirectPayment')}</p></div>
        </aside>
    )
}
