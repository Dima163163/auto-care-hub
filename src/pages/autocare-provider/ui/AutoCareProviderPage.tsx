import { BadgeCheck, Clock3, Globe2, Mail, MapPinned, Phone, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { AutomotiveAmenityIcon, automotiveAmenities, getAutomotiveAmenityLabel, mapAutoCareProviderProfile, useGetAutoCareProviderProfileQuery, useGetAutoCareProviderTrustQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProviderHero } from './ProviderHero'
import { ProviderLocationMap } from './ProviderLocationMap'
import { ProviderOfferings } from './ProviderOfferings'
import { ProviderRequestPanel } from './ProviderRequestPanel'
import { ProviderReviews } from './ProviderReviews'
import { ProviderSectionNavigation } from './ProviderSectionNavigation'

export function AutoCareProviderPage() {
    const { id = '' } = useParams()
    const { t } = useTranslation()
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const { data: trust } = useGetAutoCareProviderTrustQuery(id, { skip: !id })
    const provider = data ? mapAutoCareProviderProfile(data) : undefined
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const selectedOffering = useMemo(() => provider?.offerings.find((item) => item.serviceId === selectedServiceId) ?? provider?.offerings[0], [provider, selectedServiceId])

    if (isLoading) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><p className="text-sm font-semibold text-muted-foreground">Loading provider…</p></main>
    if (isError || !provider || !selectedOffering) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>

    return <><ProviderHero provider={provider} /><ProviderSectionNavigation /><main className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 px-[var(--layout-gutter)] py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]"><div className="grid content-start gap-6"><ProviderOfferings provider={provider} selectedServiceId={selectedOffering.serviceId} onSelect={setSelectedServiceId} /><ProviderAbout provider={provider} trust={trust} /><ProviderLocation provider={provider} /><ProviderReviews provider={provider} /></div><ProviderRequestPanel provider={provider} offering={selectedOffering} /></main></>
}

function ProviderAbout({ provider, trust }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>>; trust?: { score: number; badge: string | null; evidence: Array<{ id: string; label: string; status: string }> } }) {
    const { t, locale } = useTranslation()
    const amenities = provider.amenities.map((amenityId) => automotiveAmenities.find((amenity) => amenity.id === amenityId)).filter((amenity) => amenity !== undefined)
    return <section id="about" className="grid gap-4 sm:grid-cols-2"><article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAbout')}</h2>{provider.verified && <span className="rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">{t('autocare.trustedBadge')}</span>}</div><p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{provider.about}</p><ul className="mt-4 grid gap-2 text-xs font-semibold text-status-success-foreground"><li>✓ {provider.warrantyText || t('autocare.providerWarranty')}</li><li>✓ {t('autocare.providerDirectPayment')}</li><li>✓ {t('autocare.providerRequestDescription')}</li></ul></article><article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAmenities')}</h2>{trust && <span className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-1 text-xs font-black text-status-success-foreground"><ShieldCheck className="size-3.5" />{trust.score.toFixed(1)}/100</span>}</div><div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">{amenities.map((amenity) => <div key={amenity.id} className="flex min-h-9 items-center gap-2 text-[11px] font-bold leading-4 text-secondary-foreground"><span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><AutomotiveAmenityIcon amenityId={amenity.id} className="size-4" /></span><span>{getAutomotiveAmenityLabel(amenity, locale)}</span></div>)}</div>{trust?.evidence.length ? <div className="mt-4 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">{trust.evidence.slice(0, 2).map((item) => <p key={item.id} className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-status-success-foreground" />{item.label}</p>)}</div> : null}</article></section>
}

function ProviderLocation({ provider }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>> }) {
    const { t } = useTranslation()
    return <section id="location" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] sm:p-6"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerFindUs')}</h2><div className="mt-4 grid gap-3 text-sm font-semibold text-muted-foreground"><p className="flex items-start gap-2"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />{provider.address}</p>{provider.metroStation && <p className="flex items-start gap-2"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />{provider.metroStation}</p>}<p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />{provider.hours}</p>{provider.phone && <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" />{provider.phone}</p>}{provider.email && <p className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-primary" />{provider.email}</p>}{provider.websiteUrl && <a href={provider.websiteUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-primary hover:underline"><Globe2 className="mt-0.5 size-4 shrink-0" />{provider.websiteUrl}</a>}</div><div className="mt-4 flex flex-wrap gap-2">{provider.supportsMobile && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Выездной сервис{provider.coverageRadiusKm ? ` · до ${provider.coverageRadiusKm} км` : ''}</span>}{provider.supportsPickup && <span className="rounded-full bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">Заберём и доставим авто</span>}</div></div><ProviderLocationMap provider={provider} /></div></section>
}
