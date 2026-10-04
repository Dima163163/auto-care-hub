import { useState } from 'react'
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
import { AdminDataQualityPanel } from './AdminDataQualityPanel'
import { AdminModerationEvidencePanel } from './AdminModerationEvidencePanel'
import { AdminChatReportsPanel } from './AdminChatReportsPanel'
import { AdminProviderChangeRequestsPanel } from './AdminProviderChangeRequestsPanel'
import { AdminOutboxControlPanel } from './AdminOutboxControlPanel'

export function AdminAutoCareDashboardPage() {
    const { locale, t } = useTranslation()
    const [activeQueue, setActiveQueue] = useState('reports')
    const providers = useGetAdminAutoCareProvidersQuery()
    const users = useGetAdminUsersQuery()
    const isLoading = providers.isLoading || users.isLoading
    const error = providers.error ?? users.error
    const providerData = providers.data ?? []
    const userData = users.data ?? []
    const providerStats = { total: providerData.length, active: providerData.filter((provider) => provider.status === 'active').length, draft: providerData.filter((provider) => provider.status === 'draft').length, verified: providerData.filter((provider) => provider.verified).length }
    const userStats = { total: userData.length, owners: userData.filter((user) => user.role === 'owner').length }
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl space-y-5"><AdminAutoCareDashboardHero locale={locale} pendingCount={providerStats.draft} />{isLoading && <DashboardSkeleton label={t('common.loading')} />}{error && <div role="alert" className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void Promise.all([providers.refetch(), users.refetch()])} label={t('common.retry')} /></div>}{!isLoading && !error && <><div className="flex flex-wrap gap-2" role="group" aria-label={t('autocare.adminWorkspaceQueues')}>{['reports', 'profiles', 'evidence', 'changes', 'catalog', 'appeals'].map((queue) => <button key={queue} type="button" aria-pressed={activeQueue === queue} aria-controls={`admin-queue-${queue}`} onClick={() => setActiveQueue(queue)} className={`min-h-11 rounded-[var(--radius-control)] border px-4 text-sm font-medium ${activeQueue === queue ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary'}`}>{t(queue === 'reports' ? 'autocare.adminQueueReports' : queue === 'profiles' ? 'autocare.adminQueueProfiles' : queue === 'evidence' ? 'autocare.adminQueueEvidence' : queue === 'changes' ? 'autocare.adminQueueChanges' : queue === 'catalog' ? 'autocare.adminQueueCatalog' : 'autocare.adminQueueAppeals')}</button>)}</div>
        <div id="admin-queue-reports" hidden={activeQueue !== 'reports'}><AdminChatReportsPanel /></div>
        <div id="admin-queue-profiles" hidden={activeQueue !== 'profiles'}><AdminAutoCareModerationQueue locale={locale} providers={providerData} /></div>
        <div id="admin-queue-evidence" hidden={activeQueue !== 'evidence'}><AdminModerationEvidencePanel /></div>
        <div id="admin-queue-changes" hidden={activeQueue !== 'changes'}><AdminProviderChangeRequestsPanel locale={locale} /></div>
        <div id="admin-queue-catalog" hidden={activeQueue !== 'catalog'}><AdminCatalogGapQueue locale={locale} /></div>
        <div id="admin-queue-appeals" hidden={activeQueue !== 'appeals'}><AdminAutoCareAppealsPanel /></div>
        <details className="rounded-[var(--radius-panel)] border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">{t('autocare.adminPlatformOverview')}</summary><div className="mt-5 space-y-5"><AdminAutoCareMetricGrid locale={locale} providers={providerStats} users={userStats} /><AdminDataQualityPanel /><AdminOutboxControlPanel /></div></details></>}</section></main>
}
