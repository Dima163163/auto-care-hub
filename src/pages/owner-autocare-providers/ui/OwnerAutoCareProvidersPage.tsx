import { useGetAutoCareMarketsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

import { OwnerAutoCareProviderForm } from './OwnerAutoCareProviderForm'
import { OwnerAutoCareProviderList } from './OwnerAutoCareProviderList'
import { OwnerAutoCareProviderMap } from './OwnerAutoCareProviderMap'

export function OwnerAutoCareProvidersPage() {
    const { t } = useTranslation()
    const { data: markets = [], isLoading: isMarketsLoading } = useGetAutoCareMarketsQuery()
    const { data: providers = [], error, isError, isLoading, refetch } = useGetOwnerAutoCareProvidersQuery()
    const market = markets.find((item) => item.launchReady) ?? markets[0]

    return <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={t('autocare.ownerProvidersEyebrow')} title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} />{!isLoading && !isError && providers.length > 0 && <section className="mb-6 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4"><div><h2 className="text-lg font-black text-foreground">{t('autocare.ownerProvidersTitle')}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.ownerProvidersDescription')}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{providers.length}</span></div><div className="h-[360px] md:h-[420px]"><OwnerAutoCareProviderMap providers={providers} /></div></section>}<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.7fr)]"><OwnerAutoCareProviderForm market={market} /><aside className="space-y-4" aria-busy={isLoading || isMarketsLoading}>{isError ? <div className="rounded-xl border bg-card p-5"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={refetch} label={t('common.retry')} /></div> : isLoading ? <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t('common.loading')}</div> : <OwnerAutoCareProviderList providers={providers} />}</aside></div></section></main>
}
