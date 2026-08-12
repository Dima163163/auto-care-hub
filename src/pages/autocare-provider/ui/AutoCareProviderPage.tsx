import { useParams } from 'react-router'

import { mapAutoCareProviderProfile, useGetAutoCareProviderProfileQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProviderHero } from './ProviderHero'
import { ProviderOfferings } from './ProviderOfferings'
import { ProviderRequestPanel } from './ProviderRequestPanel'
import { ProviderReviews } from './ProviderReviews'

export function AutoCareProviderPage() {
    const { id = '' } = useParams()
    const { t } = useTranslation()
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const provider = data ? mapAutoCareProviderProfile(data) : undefined

    if (isLoading) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><p className="text-sm font-semibold text-muted-foreground">Loading provider…</p></main>
    if (isError || !provider) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>

    return <><ProviderHero provider={provider} /><main className="mx-auto grid max-w-[var(--layout-operational-max)] gap-6 px-[var(--layout-gutter)] py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]"><div className="grid content-start gap-6"><ProviderOfferings provider={provider} /><section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('autocare.providerProfile')}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">{t('autocare.providerAbout')}</h2></div><span className="rounded-full bg-status-success-surface px-3 py-1.5 text-xs font-bold text-status-success-foreground">{t('autocare.trustedBadge')}</span></div><p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-muted-foreground">{provider.about}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{provider.amenities.map((amenity) => <div key={amenity} className="flex items-center gap-3 rounded-[var(--radius-card)] bg-secondary p-3 text-sm font-bold text-secondary-foreground"><span className="flex size-8 items-center justify-center rounded-full bg-card text-primary">✓</span>{amenity}</div>)}</div></section><ProviderReviews provider={provider} /></div><ProviderRequestPanel provider={provider} /></main></>
}
