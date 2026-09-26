import { ArrowRight, Building2, Globe2, KeyRound, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import { useGetSuperAdminPlatformOverviewQuery } from '@/entities/automotive-service'
import type { SuperAdminPlatformOverview } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { formatNumber } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { DashboardSkeleton } from '@/shared/ui/loading-skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

import { AdminAutoCareAppealsPanel } from '@/pages/admin-dashboard/ui/AdminAutoCareAppealsPanel'
import { AdminChatReportsPanel } from '@/pages/admin-dashboard/ui/AdminChatReportsPanel'
import { AdminDataQualityPanel } from '@/pages/admin-dashboard/ui/AdminDataQualityPanel'

import { SuperAdminMarketsPanel } from './SuperAdminMarketsPanel'
import { SuperAdminTrustPolicyPanel } from './SuperAdminTrustPolicyPanel'

export function SuperAdminDashboardPage() {
    const { locale, t } = useTranslation()
    const query = useGetSuperAdminPlatformOverviewQuery()
    const formatInteger = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 0 })
    const marketGroups = groupMarkets(query.data?.markets ?? [])
    const text = {
        eyebrow: t('superAdminDashboard.eyebrow'),
        title: t('superAdminDashboard.title'),
        description: t('superAdminDashboard.description'),
        markets: t('superAdminDashboard.markets'),
        team: t('superAdminDashboard.team'),
        trust: t('superAdminDashboard.trust'),
        locked: t('superAdminDashboard.locked'),
        users: t('superAdminDashboard.users'),
        audit: t('superAdminDashboard.audit'),
        providers: t('superAdminDashboard.providers'),
        activeMarkets: t('superAdminDashboard.activeMarkets'),
        active: t('superAdminDashboard.active'),
        clients: t('superAdminDashboard.clients'),
        owners: t('superAdminDashboard.owners'),
        admins: t('superAdminDashboard.admins'),
        superAdmin: t('superAdminDashboard.superAdmin'),
        notProvided: t('common.notProvided'),
    }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
        <section className="mx-auto max-w-7xl space-y-5">
            <section className="rounded-[var(--radius-panel)] border border-primary/30 bg-card p-6 shadow-sm md:p-8">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><KeyRound className="size-4" />{text.eyebrow}</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-foreground md:text-4xl">{text.title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p>
            </section>

            {query.isLoading && <DashboardSkeleton label={t('common.loading')} />}
            {query.error && <div role="alert" className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void query.refetch()} label={t('common.retry')} /></div>}

            {query.data && <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric icon={Globe2} label={text.markets} value={formatInteger(query.data.markets.length)} note={`${formatInteger(query.data.markets.filter((market) => market.launchReady).length)} ${text.activeMarkets}`} />
                    <Metric icon={Building2} label={text.trust} value={`${formatInteger(query.data.providers.verified)}/${formatInteger(query.data.providers.total)}`} note={`${formatInteger(query.data.providers.active)} ${text.active}`} />
                    <Metric icon={UsersRound} label={text.team} value={formatInteger(query.data.users.admins + query.data.users.superAdmins)} note={`${formatInteger(query.data.users.owners)} ${text.providers}`} />
                </section>
                <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                    <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.markets}</h2><div className="mt-5 space-y-2">{marketGroups.map((group) => <details key={group.countryCode} className="group rounded-[var(--radius-card)] border border-border bg-background"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-black text-foreground [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-2"><CountryFlag countryCode={group.countryCode} /><span className="min-w-0 truncate">{group.countryName} <span className="ml-1 text-xs font-bold text-muted-foreground">{group.countryCode}</span></span></span><span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-black text-muted-foreground" aria-label={`${group.countryName}: ${formatInteger(group.markets.length)}`}>{formatInteger(group.markets.length)}</span></summary><div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">{group.markets.map((market) => <div key={market.id} className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-control)] bg-card px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-black text-foreground">{market.cityName}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{market.currencyCode} · {market.supportedLocales.join(', ').toUpperCase()}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${market.launchReady ? 'bg-status-success-surface text-status-success-foreground' : 'bg-secondary text-muted-foreground'}`}>{market.launchReady ? text.active : text.locked}</span></div>)}</div></details>)}</div></article>
                    <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.team}</h2><div className="mt-5 space-y-3"><Info label={text.clients} value={formatInteger(query.data.users.clients)} /><Info label={text.owners} value={formatInteger(query.data.users.owners)} /><Info label={text.admins} value={formatInteger(query.data.users.admins)} /><Info label={text.superAdmin} value={formatInteger(query.data.users.superAdmins)} /></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Link to={ROUTES.adminUsers} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><UsersRound className="size-4" />{text.users}</Link><Link to={ROUTES.adminAuditLogs} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><ArrowRight className="size-4" />{text.audit}</Link></div></article>
                </section>
                <AdminDataQualityPanel />
                <AdminAutoCareAppealsPanel />
                <AdminChatReportsPanel />
                <SuperAdminTrustPolicyPanel />
                <SuperAdminMarketsPanel locale={locale} />
            </>}
        </section>
    </main>
}

function groupMarkets(markets: SuperAdminPlatformOverview['markets']) {
    const groups = new Map<string, { countryCode: string; countryName: string; markets: SuperAdminPlatformOverview['markets'] }>()
    markets.forEach((market) => {
        const group = groups.get(market.countryCode)
        if (group) group.markets.push(market)
        else groups.set(market.countryCode, { countryCode: market.countryCode, countryName: market.countryName, markets: [market] })
    })
    return Array.from(groups.values())
}

type CountryFlagDefinition = {
    orientation: 'horizontal' | 'vertical'
    bands: { color: string; weight: number }[]
}

const countryFlagDefinitions: Partial<Record<string, CountryFlagDefinition>> = {
    ES: { orientation: 'horizontal', bands: [{ color: 'var(--flag-es-red)', weight: 1 }, { color: 'var(--flag-es-yellow)', weight: 2 }, { color: 'var(--flag-es-red)', weight: 1 }] },
    MD: { orientation: 'vertical', bands: [{ color: 'var(--flag-md-blue)', weight: 1 }, { color: 'var(--flag-md-yellow)', weight: 1 }, { color: 'var(--flag-md-red)', weight: 1 }] },
    RU: { orientation: 'horizontal', bands: [{ color: 'var(--flag-ru-white)', weight: 1 }, { color: 'var(--flag-ru-blue)', weight: 1 }, { color: 'var(--flag-ru-red)', weight: 1 }] },
}

function CountryFlag({ countryCode }: { countryCode: string }) {
    const normalizedCode = countryCode.trim().toUpperCase()
    const flag = countryFlagDefinitions[normalizedCode]

    if (!flag) return <Globe2 aria-hidden="true" className="size-4 shrink-0 text-primary" />

    return <span data-country-flag={normalizedCode} aria-hidden="true" className="size-6 shrink-0 overflow-hidden rounded-full border border-border bg-background shadow-sm">
        <span className={`flex h-full w-full ${flag.orientation === 'horizontal' ? 'flex-col' : 'flex-row'}`}>
            {flag.bands.map((band, index) => <span key={`${band.color}-${index}`} className="min-h-0 min-w-0" style={{ backgroundColor: band.color, flex: band.weight }} />)}
        </span>
    </span>
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Globe2; label: string; value: string; note: string }) { return <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article> }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-secondary px-4 py-3"><span className="text-sm font-semibold text-muted-foreground">{label}</span><b className="text-sm font-black text-foreground">{value}</b></div> }
