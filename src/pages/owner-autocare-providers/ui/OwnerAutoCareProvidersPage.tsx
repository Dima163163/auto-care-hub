import { useGetAutoCareMarketsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { CardsGridSkeleton } from '@/shared/ui/loading-skeleton'
import { StateCard } from '@/shared/ui/state-card'

import { OwnerAutoCareProviderForm } from './OwnerAutoCareProviderForm'
import { OwnerAutoCareProviderList } from './OwnerAutoCareProviderList'
import { OwnerAutoCareProviderMap } from './OwnerAutoCareProviderMap'

export function OwnerAutoCareProvidersPage() {
    const { t } = useTranslation()
    const { data: markets = [], isLoading: isMarketsLoading } = useGetAutoCareMarketsQuery()
    const { data: providers = [], error, isError, isLoading, refetch } = useGetOwnerAutoCareProvidersQuery()
    const market = markets.find((item) => item.launchReady) ?? markets[0]

    return <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={t('autocare.ownerProvidersEyebrow')} title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} />{!isLoading && !isError && providers.length > 0 && <section className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4"><div><h2 className="text-lg font-black text-foreground">{t('autocare.ownerProvidersTitle')}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.ownerProvidersDescription')}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{providers.length}</span></div><div className="h-[360px] md:h-[420px]"><OwnerAutoCareProviderMap providers={providers} /></div></section>}<section className="mt-6"><OwnerAutoCareProviderForm key={market?.id ?? 'new'} market={market} /></section><section className="mt-6" aria-busy={isLoading || isMarketsLoading}>{isError ? <StateCard variant="error" title={t('common.failedToLoad')} description={getApiErrorMessage(error, t('common.failedToLoad'))} action={<RetryButton onRetry={refetch} label={t('common.retry')} />} /> : isLoading ? <CardsGridSkeleton label={t('common.loading')} /> : providers.length === 0 ? <StateCard variant="empty" title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} /> : <OwnerAutoCareProviderList providers={providers} />}</section></section></main>
}
