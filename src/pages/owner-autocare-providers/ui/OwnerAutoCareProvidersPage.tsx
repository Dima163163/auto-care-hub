import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus, X } from 'lucide-react'
import { useGetAutoCareMarketsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { CardsGridSkeleton } from '@/shared/ui/loading-skeleton'
import { StateCard } from '@/shared/ui/state-card'
import { Button } from '@/components/ui/button'
import { OwnerAutoCareProviderForm } from './OwnerAutoCareProviderForm'
import { OwnerAutoCareProviderList } from './OwnerAutoCareProviderList'
import { OwnerAutoCareProviderMap } from './OwnerAutoCareProviderMap'

export function OwnerAutoCareProvidersPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const [isCreating, setIsCreating] = useState(() => searchParams.get('create') === '1')
    const { data: markets = [], isLoading: isMarketsLoading } = useGetAutoCareMarketsQuery()
    const { data: providers = [], error, isError, isLoading, refetch } = useGetOwnerAutoCareProvidersQuery()
    const market = markets.find((item) => item.launchReady) ?? markets[0]
    return <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8"><section className="mx-auto max-w-6xl">
        <PageHeader eyebrow={t('autocare.ownerProvidersEyebrow')} title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{t('autocare.managedProviderCount', { count: providers.length })}</p><Button type="button" aria-expanded={isCreating} aria-controls="owner-provider-create" onClick={() => setIsCreating((value) => !value)}>{isCreating ? <X className="size-4" /> : <Plus className="size-4" />}{t(isCreating ? 'common.close' : 'autocare.ownerProvidersCreateTitle')}</Button></div>
        <section id="owner-provider-create" hidden={!isCreating} className="mb-6"><OwnerAutoCareProviderForm key={market?.id ?? 'new'} market={market} /></section>
        <section aria-busy={isLoading || isMarketsLoading}>{isError ? <StateCard variant="error" title={t('common.failedToLoad')} description={getApiErrorMessage(error, t('common.failedToLoad'))} action={<RetryButton onRetry={refetch} label={t('common.retry')} />} /> : isLoading ? <CardsGridSkeleton label={t('common.loading')} /> : providers.length === 0 ? <StateCard variant="empty" title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} /> : <OwnerAutoCareProviderList providers={providers} />}</section>
        {!isLoading && !isError && providers.length > 0 && <details className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card"><summary className="cursor-pointer px-5 py-4 text-sm font-semibold">{t('autocare.viewOnMap')}</summary><div className="h-72 md:h-80"><OwnerAutoCareProviderMap providers={providers} /></div></details>}
    </section></main>
}
