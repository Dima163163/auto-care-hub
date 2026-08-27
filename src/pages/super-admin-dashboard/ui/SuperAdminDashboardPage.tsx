import { ArrowRight, Building2, Globe2, KeyRound, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import { useGetSuperAdminPlatformOverviewQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { DashboardSkeleton } from '@/shared/ui/loading-skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

import { AdminAutoCareAppealsPanel } from '@/pages/admin-dashboard/ui/AdminAutoCareAppealsPanel'
import { AdminChatReportsPanel } from '@/pages/admin-dashboard/ui/AdminChatReportsPanel'
import { AdminDataQualityPanel } from '@/pages/admin-dashboard/ui/AdminDataQualityPanel'

import { SuperAdminMarketsPanel } from './SuperAdminMarketsPanel'
import { SuperAdminTrustPolicyPanel } from './SuperAdminTrustPolicyPanel'

const copy = {
    en: {
        eyebrow: 'Super-admin control center',
        title: 'Control markets, access and quality rules.',
        description: 'Only super-admins can change platform-wide roles and quality rules.',
        markets: 'Markets and languages',
        team: 'Access and roles',
        trust: 'Trust programme',
        locked: 'Not enabled yet',
        users: 'Manage users',
        audit: 'Open audit log',
        providers: 'providers',
        active: 'active',
    },
    ru: {
        eyebrow: 'Центр управления super-admin',
        title: 'Управляйте рынками, доступами и правилами качества.',
        description: 'Только super-admin меняет роли платформы и правила качества.',
        markets: 'Рынки и языки',
        team: 'Доступы и роли',
        trust: 'Программа доверия',
        locked: 'Пока не включено',
        users: 'Управлять пользователями',
        audit: 'Открыть журнал аудита',
        providers: 'сервисов',
        active: 'активно',
    },
}

export function SuperAdminDashboardPage() {
    const { locale, t } = useTranslation()
    const query = useGetSuperAdminPlatformOverviewQuery()
    const text = locale === 'ru' ? copy.ru : copy.en

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section className="mx-auto max-w-6xl space-y-5">
                <section className="rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.17),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><KeyRound className="size-4" />{text.eyebrow}</p>
                    <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-foreground md:text-4xl">{text.title}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p>
                </section>

                {query.isLoading && <DashboardSkeleton label={t('common.loading')} />}
                {query.error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void query.refetch()} label={t('common.retry')} /></div>}

                {query.data && <>
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <Metric icon={Globe2} label={text.markets} value={query.data.markets.length} note={query.data.markets.map((market) => market.cityName).join(' · ') || '—'} />
                        <Metric icon={Building2} label={text.trust} value={`${query.data.providers.verified}/${query.data.providers.total}`} note={`${query.data.providers.active} ${text.active}`} />
                        <Metric icon={UsersRound} label={text.team} value={query.data.users.admins + query.data.users.superAdmins} note={`${query.data.users.owners} ${text.providers}`} />
                    </section>
                    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(350px,0.9fr)]">
                        <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.markets}</h2><div className="mt-5 space-y-3">{query.data.markets.map((market) => <div key={market.id} className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border p-4"><div><p className="font-black text-foreground">{market.cityName}, {market.countryName}</p><p className="mt-1 text-xs text-muted-foreground">{market.currencyCode} · {market.supportedLocales.join(', ').toUpperCase()}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-black ${market.launchReady ? 'bg-status-success-surface text-status-success-foreground' : 'bg-secondary text-muted-foreground'}`}>{market.launchReady ? text.active : text.locked}</span></div>)}</div></article>
                        <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.team}</h2><div className="mt-5 space-y-3"><Info label={locale === 'ru' ? 'Клиенты' : 'Clients'} value={query.data.users.clients} /><Info label={locale === 'ru' ? 'Владельцы сервисов' : 'Service owners'} value={query.data.users.owners} /><Info label={locale === 'ru' ? 'Администраторы' : 'Admins'} value={query.data.users.admins} /><Info label="Super-admin" value={query.data.users.superAdmins} /></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Link to={ROUTES.adminUsers} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><UsersRound className="size-4" />{text.users}</Link><Link to={ROUTES.adminAuditLogs} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><ArrowRight className="size-4" />{text.audit}</Link></div></article>
                    </section>
                    <AdminDataQualityPanel />
                    <AdminAutoCareAppealsPanel />
                    <AdminChatReportsPanel />
                    <SuperAdminTrustPolicyPanel locale={locale} />
                    <SuperAdminMarketsPanel locale={locale} />
                </>}
            </section>
        </main>
    )
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Globe2; label: string; value: string | number; note: string }) { return <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article> }
function Info({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-secondary px-4 py-3"><span className="text-sm font-semibold text-muted-foreground">{label}</span><b className="text-sm font-black text-foreground">{value}</b></div> }
