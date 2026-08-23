import { BadgeCheck, Clock3, Globe2, Mail, MapPinned, Phone, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { AutomotiveAmenityIcon, automotiveAmenities, getAutomotiveAmenityLabel, mapAutoCareProviderProfile, type AutoCareTrustResponse, useGetAutoCareProviderProfileQuery, useGetAutoCareProviderReviewsQuery, useGetAutoCareProviderTrustQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ProviderProfileSkeleton } from '@/shared/ui/loading-skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { StateCard } from '@/shared/ui/state-card'

import { ProviderHero } from './ProviderHero'
import { ProviderLocationMap } from './ProviderLocationMap'
import { ProviderOfferings } from './ProviderOfferings'
import { ProviderRequestPanel } from './ProviderRequestPanel'
import { ProviderReviews } from './ProviderReviews'
import { ProviderSectionNavigation } from './ProviderSectionNavigation'

export function AutoCareProviderPage() {
    const { id = '' } = useParams()
    const { t } = useTranslation()
    const { data, isLoading, isError, isFetching, refetch } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const { data: reviewSummary, isLoading: isReviewsLoading, isError: isReviewsError, refetch: refetchReviews } = useGetAutoCareProviderReviewsQuery({ providerId: id, limit: 50 }, { skip: !id })
    const { data: trust } = useGetAutoCareProviderTrustQuery(id, { skip: !id })
    const provider = data ? mapAutoCareProviderProfile(data, reviewSummary) : undefined
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const selectedOffering = useMemo(() => provider?.offerings.find((item) => item.serviceId === selectedServiceId) ?? provider?.offerings[0], [provider, selectedServiceId])

    if (isLoading) return <main className="min-h-full bg-background"><ProviderProfileSkeleton label={t('common.loading')} /></main>
    if (isError || !provider) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20"><StateCard variant="error" title={t('autocare.providerNotFound')} description={t('common.tryAgainLater')} action={<RetryButton onRetry={refetch} label={t('common.retry')} />} /></main>
    if (!selectedOffering) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20"><StateCard variant="empty" title={t('autocare.providerNoOffersTitle')} description={t('autocare.providerNoOffersDescription')} /></main>

    return <><ProviderHero provider={provider} /><ProviderSectionNavigation /><main className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 px-[var(--layout-gutter)] py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]"><div className="grid content-start gap-6"><QueryRefreshStatus isRefreshing={isFetching && !isLoading} label={t('common.refreshing')} /><ProviderOfferings provider={provider} selectedServiceId={selectedOffering.serviceId} onSelect={setSelectedServiceId} /><ProviderAbout provider={provider} trust={trust} /><ProviderLocation provider={provider} /><ProviderReviews provider={provider} isLoading={isReviewsLoading} isError={isReviewsError} onRetry={refetchReviews} /></div><ProviderRequestPanel provider={provider} offering={selectedOffering} /></main></>
}

function ProviderAbout({ provider, trust }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>>; trust?: AutoCareTrustResponse }) {
    const { t, locale } = useTranslation()
    const [showTrustDetails, setShowTrustDetails] = useState(false)
    const amenities = provider.amenities.map((amenityId) => automotiveAmenities.find((amenity) => amenity.id === amenityId)).filter((amenity) => amenity !== undefined)
    return <section id="about" className="grid gap-4 sm:grid-cols-2"><article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAbout')}</h2>{provider.verified && <span className="rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">{t('autocare.trustedBadge')}</span>}</div><p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{provider.about}</p><ul className="mt-4 grid gap-2 text-xs font-semibold text-status-success-foreground"><li>✓ {provider.warrantyText || t('autocare.providerWarranty')}</li><li>✓ {t('autocare.providerDirectPayment')}</li><li>✓ {t('autocare.providerRequestDescription')}</li></ul></article><article id="trust" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerAmenities')}</h2>{trust?.badge && <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-status-success-foreground"><ShieldCheck className="size-3.5" />{t('autocare.trustBadgeLabel')}</p>}</div>{trust && <span className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-1 text-xs font-black text-status-success-foreground"><ShieldCheck className="size-3.5" />{trust.score.toFixed(1)}/100</span>}</div><div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">{amenities.map((amenity) => <div key={amenity.id} className="flex min-h-9 items-center gap-2 text-[11px] font-bold leading-4 text-secondary-foreground"><span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><AutomotiveAmenityIcon amenityId={amenity.id} className="size-4" /></span><span>{getAutomotiveAmenityLabel(amenity, locale)}</span></div>)}</div>{trust?.evidence.length ? <div className="mt-4 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">{trust.evidence.slice(0, 2).map((item) => <p key={item.id} className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-status-success-foreground" />{item.label}</p>)}</div> : null}{trust && <><button type="button" onClick={() => setShowTrustDetails((open) => !open)} aria-expanded={showTrustDetails} className="mt-4 inline-flex items-center rounded-[var(--radius-control)] border border-border px-3 py-2 text-xs font-bold text-primary hover:border-primary">{showTrustDetails ? t('autocare.trustHideDetails') : t('autocare.trustWhyAction')}</button>{showTrustDetails && <ProviderTrustDetails trust={trust} locale={locale} />}</>}</article></section>
}

function ProviderTrustDetails({ trust, locale }: { trust: AutoCareTrustResponse; locale: string }) {
    const { t } = useTranslation()
    const factors = trust.factors ? [
        ['profile', t('autocare.trustFactorProfile'), trust.factors.profile],
        ['reviews', t('autocare.trustFactorReviews'), trust.factors.reviews],
        ['evidence', t('autocare.trustFactorEvidence'), trust.factors.evidence],
        ['reliability', t('autocare.trustFactorReliability'), trust.factors.reliability],
        ['claimsPenalty', t('autocare.trustFactorClaims'), trust.factors.claimsPenalty],
    ] as const : []
    const reassessedAt = trust.reassessedAt ? new Date(trust.reassessedAt) : null
    return <div className="mt-4 grid gap-3 border-t border-border pt-4 text-xs"><p className="font-semibold leading-5 text-muted-foreground">{trust.explanation || t('autocare.trustExplanation')}</p>{factors.length > 0 && <div className="grid gap-2">{factors.map(([key, label, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><span className="font-semibold text-secondary-foreground">{label}</span><span className="font-black text-foreground">{value.toFixed(1)}</span><div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${key === 'claimsPenalty' ? 'bg-status-warning-foreground' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>)}</div>}<p className="font-medium text-muted-foreground">{t('autocare.trustPolicyVersion')} · {reassessedAt && !Number.isNaN(reassessedAt.getTime()) ? reassessedAt.toLocaleDateString(locale) : t('autocare.trustNotAvailable')}</p></div>
}

function ProviderLocation({ provider }: { provider: NonNullable<ReturnType<typeof mapAutoCareProviderProfile>> }) {
    const { t } = useTranslation()
    return <section id="location" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] sm:p-6"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerFindUs')}</h2><div className="mt-4 grid gap-3 text-sm font-semibold text-muted-foreground"><p className="flex items-start gap-2"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />{provider.address}</p>{provider.metroStation && <p className="flex items-start gap-2"><MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />{provider.metroStation}</p>}<p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />{provider.hours}</p>{provider.phones.length > 0 ? provider.phones.map((phone) => <p key={phone} className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" />{phone}</p>) : provider.phone && <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" />{provider.phone}</p>}{provider.email && <p className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-primary" />{provider.email}</p>}{provider.websiteUrl && <a href={provider.websiteUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-primary hover:underline"><Globe2 className="mt-0.5 size-4 shrink-0" />{provider.websiteUrl}</a>}</div><div className="mt-4 flex flex-wrap gap-2">{provider.supportsMobile && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Выездной сервис{provider.coverageRadiusKm ? ` · до ${provider.coverageRadiusKm} км` : ''}</span>}{provider.supportsPickup && <span className="rounded-full bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">Заберём и доставим авто</span>}</div></div><ProviderLocationMap provider={provider} /></div></section>
}
