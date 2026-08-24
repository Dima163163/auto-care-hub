import { useState } from 'react'

import { useGetMeQuery } from '@/features/auth'
import { useGetOwnerAutoCareProviderAnalyticsQuery, useGetOwnerAutoCareProvidersQuery, useGetOwnerAutoCareServiceRequestsQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { DashboardSkeleton } from '@/shared/ui/loading-skeleton'

import { buildOwnerAutoCareMetrics } from '../lib/ownerAutoCareMetrics'
import { OwnerAutoCareBranchPanel } from './OwnerAutoCareBranchPanel'
import { OwnerAutoCareDashboardHero } from './OwnerAutoCareDashboardHero'
import { OwnerAutoCareMetricGrid } from './OwnerAutoCareMetricGrid'
import { OwnerAutoCareQuickActions } from './OwnerAutoCareQuickActions'
import { OwnerAutoCareRequestQueue } from './OwnerAutoCareRequestQueue'
import { OwnerFleetPanel } from './OwnerFleetPanel'
import { OwnerBroadcastRequestsPanel } from './OwnerBroadcastRequestsPanel'
import { OwnerAutoCareAnalyticsCard } from './OwnerAutoCareAnalyticsCard'

export function OwnerAutoCareDashboardPage() {
    const { locale, t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const providers = useGetOwnerAutoCareProvidersQuery()
    const requests = useGetOwnerAutoCareServiceRequestsQuery()
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const primaryProviderId = providers.data?.some((provider) => provider.id === selectedProviderId)
        ? selectedProviderId
        : providers.data?.[0]?.id ?? ''
    const analytics = useGetOwnerAutoCareProviderAnalyticsQuery(primaryProviderId, { skip: !primaryProviderId })
    const isLoading = providers.isLoading || requests.isLoading
    const error = providers.error ?? requests.error
    const metrics = buildOwnerAutoCareMetrics(providers.data ?? [], requests.data ?? [])
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl space-y-5"><OwnerAutoCareDashboardHero locale={locale} ownerName={user?.name} />{isLoading && <DashboardSkeleton label={t('common.loading')} />}{error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void Promise.all([providers.refetch(), requests.refetch()])} label={t('common.retry')} /></div>}{!isLoading && !error && <><OwnerAutoCareMetricGrid locale={locale} metrics={metrics} /><OwnerAutoCareAnalyticsCard locale={locale} analytics={analytics.data} isLoading={analytics.isLoading} isError={analytics.isError} providers={providers.data ?? []} selectedProviderId={primaryProviderId} onProviderChange={setSelectedProviderId} onRetry={analytics.refetch} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]"><OwnerAutoCareRequestQueue locale={locale} requests={requests.data ?? []} /><OwnerAutoCareBranchPanel locale={locale} providers={providers.data ?? []} /></div><OwnerAutoCareQuickActions locale={locale} /><OwnerBroadcastRequestsPanel /><OwnerFleetPanel /></>}</section></main>
}
