import { useGetAdminAutoCareProvidersQuery } from '@/entities/automotive-service'
import { useGetAdminUsersQuery } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { DashboardSkeleton } from '@/shared/ui/loading-skeleton'

import { AdminAutoCareDashboardHero } from './AdminAutoCareDashboardHero'
import { AdminAutoCareMetricGrid } from './AdminAutoCareMetricGrid'
import { AdminAutoCareModerationQueue } from './AdminAutoCareModerationQueue'
import { AdminAutoCareAppealsPanel } from './AdminAutoCareAppealsPanel'
import { AdminCatalogGapQueue } from './AdminCatalogGapQueue'

export function AdminAutoCareDashboardPage() {
    const { locale, t } = useTranslation()
    const providers = useGetAdminAutoCareProvidersQuery()
    const users = useGetAdminUsersQuery()
    const isLoading = providers.isLoading || users.isLoading
    const error = providers.error ?? users.error
    const providerData = providers.data ?? []
    const userData = users.data ?? []
    const providerStats = { total: providerData.length, active: providerData.filter((provider) => provider.status === 'active').length, draft: providerData.filter((provider) => provider.status === 'draft').length, verified: providerData.filter((provider) => provider.verified).length }
    const userStats = { total: userData.length, owners: userData.filter((user) => user.role === 'owner').length }
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl space-y-5"><AdminAutoCareDashboardHero locale={locale} pendingCount={providerStats.draft} />{isLoading && <DashboardSkeleton label={t('common.loading')} />}{error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void Promise.all([providers.refetch(), users.refetch()])} label={t('common.retry')} /></div>}{!isLoading && !error && <><AdminAutoCareMetricGrid locale={locale} providers={providerStats} users={userStats} /><AdminAutoCareModerationQueue locale={locale} providers={providerData} /><AdminCatalogGapQueue locale={locale} /><AdminAutoCareAppealsPanel /></>}</section></main>
}
