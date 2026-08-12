import { CarFront, Clock3, MapPinned, Phone, Wifi } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { mapAutoCareProviderProfile, useGetAutoCareProviderProfileQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProviderHero } from './ProviderHero'
import { ProviderOfferings } from './ProviderOfferings'
import { ProviderRequestPanel } from './ProviderRequestPanel'
import { ProviderReviews } from './ProviderReviews'
import { ProviderSectionNavigation } from './ProviderSectionNavigation'

export function AutoCareProviderPage() {
    const { id = '' } = useParams()
    const { t } = useTranslation()
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const provider = data ? mapAutoCareProviderProfile(data) : undefined
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const selectedOffering = useMemo(() => provider?.offerings.find((item) => item.serviceId === selectedServiceId) ?? provider?.offerings[0], [provider, selectedServiceId])

    if (isLoading) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><p className="text-sm font-semibold text-muted-foreground">Loading provider…</p></main>
    if (isError || !provider || !selectedOffering) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>

    return <><ProviderHero provider={provider} /><ProviderSectionNavigation /><main className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 px-[var(--layout-gutter)] py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]"><div className="grid content-start gap-6"><ProviderOfferings provider={provider} selectedServiceId={selectedOffering.serviceId} onSelect={setSelectedServiceId} /><ProviderAbout provider={provider} /><ProviderLocation provider={provider} /><ProviderReviews provider={provider} /></div><ProviderRequestPanel provider={provider} offering={selectedOffering} /></main></>
}

function ProviderAbout({ provider }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>> }) {
    const { t } = useTranslation()
    const amenities = [t('autocare.providerAmenityPhoto'), t('autocare.providerAmenityUpdates'), t('autocare.providerAmenityPayment')]
    return <section id="about" className="grid gap-4 sm:grid-cols-2"><article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAbout')}</h2>{provider.verified && <span className="rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">{t('autocare.trustedBadge')}</span>}</div><p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{provider.about}</p><ul className="mt-4 grid gap-2 text-xs font-semibold text-status-success-foreground"><li>✓ {t('autocare.providerWarranty')}</li><li>✓ {t('autocare.providerDirectPayment')}</li><li>✓ {t('autocare.providerRequestDescription')}</li></ul></article><article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAmenities')}</h2><div className="mt-4 grid grid-cols-2 gap-2">{amenities.map((amenity, index) => <div key={amenity} className="flex min-h-14 items-center gap-2 rounded-[var(--radius-card)] bg-secondary p-3 text-xs font-bold text-secondary-foreground"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-primary">{index % 2 === 0 ? <CarFront className="size-3.5" /> : <Wifi className="size-3.5" />}</span>{amenity}</div>)}</div></article></section>
}

function ProviderLocation({ provider }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>> }) {
    const { t } = useTranslation()
    return <section id="location" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] sm:p-6"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerFindUs')}</h2><div className="mt-4 grid gap-3 text-sm font-semibold text-muted-foreground"><p className="flex items-start gap-2"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />{provider.address}</p><p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />{provider.hours}</p><p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" />+7 (495) 645-35-35</p></div></div><div className="relative min-h-36 overflow-hidden rounded-[var(--radius-card)] bg-hero-overlay"><div className="absolute inset-0 bg-[url('/images/autocare/hero-map-generated.webp')] bg-cover bg-center opacity-55" /><div className="relative flex h-full items-center justify-center"><span className="rounded-[var(--radius-control)] bg-card px-3 py-2 text-xs font-black text-primary shadow-sm">{t('autocare.viewOnMap')}</span></div></div></div></section>
}
