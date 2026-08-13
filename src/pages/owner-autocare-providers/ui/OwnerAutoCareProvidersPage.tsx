import { useGetAutoCareMarketsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

import { OwnerAutoCareProviderForm } from './OwnerAutoCareProviderForm'
import { OwnerAutoCareProviderList } from './OwnerAutoCareProviderList'

export function OwnerAutoCareProvidersPage() {
    const { t } = useTranslation()
    const { data: markets = [], isLoading: isMarketsLoading } = useGetAutoCareMarketsQuery()
    const { data: providers = [], error, isError, isLoading, refetch } = useGetOwnerAutoCareProvidersQuery()
    const market = markets.find((item) => item.launchReady) ?? markets[0]

    return <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={t('autocare.ownerProvidersEyebrow')} title={t('autocare.ownerProvidersTitle')} description={t('autocare.ownerProvidersDescription')} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.7fr)]"><OwnerAutoCareProviderForm market={market} /><aside className="space-y-4" aria-busy={isLoading || isMarketsLoading}>{isError ? <div className="rounded-xl border bg-card p-5"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={refetch} label={t('common.retry')} /></div> : isLoading ? <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t('common.loading')}</div> : <OwnerAutoCareProviderList providers={providers} />}</aside></div></section></main>
}
