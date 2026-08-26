import { ArrowLeft, BarChart3, CalendarCheck2, MapPin, MessageSquareText, Star, UsersRound } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useGetOwnerAutoCareProvidersQuery, useGetOwnerAutoCareWorkspaceAccessQuery, type AutoCareApiProvider } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { AutoCareImage } from '@/shared/ui/autocare-image'
import { CardsGridSkeleton } from '@/shared/ui/loading-skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

import { OwnerProviderMembersPanel } from './OwnerProviderMembersPanel'
import { OwnerProviderOnboardingPanel } from './OwnerProviderOnboardingPanel'
import { OwnerProviderBonusPanel } from './OwnerProviderBonusPanel'
import { OwnerProviderCommunicationSettings } from './OwnerProviderCommunicationSettings'
import { OwnerProviderEvidencePanel } from './OwnerProviderEvidencePanel'

export function OwnerAutoCareProviderDetailsPage() {
    const { locale, t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    const { data: providers = [], isLoading, isError, error, refetch } = useGetOwnerAutoCareProvidersQuery()
    const workspaceAccess = useGetOwnerAutoCareWorkspaceAccessQuery()
    const provider = providers.find((item) => item.id === id)

    if (isLoading) return <main className="min-h-full bg-background px-4 py-10 lg:px-8"><div className="mx-auto max-w-6xl"><CardsGridSkeleton label={t('common.loading')} /></div></main>
    if (isError) return <main className="min-h-full bg-background px-4 py-10 lg:px-8"><div className="mx-auto max-w-6xl"><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"><ArrowLeft className="size-4" />{t('auth.accountMenuAllBranches')}</Link><StateCard className="mt-8" variant="error" title={t('common.failedToLoad')} description={getApiErrorMessage(error, t('common.failedToLoad'))} action={<RetryButton onRetry={refetch} label={t('common.retry')} />} /></div></main>
    if (!provider) return <main className="min-h-full bg-background px-4 py-10 lg:px-8"><div className="mx-auto max-w-6xl"><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"><ArrowLeft className="size-4" />{t('auth.accountMenuAllBranches')}</Link><StateCard className="mt-8" variant="empty" title={t('autocare.ownerProviderNotFound')} description={t('autocare.ownerProvidersDescription')} /></div></main>

    const scope = workspaceAccess.data?.scopes.find((item) => item.providerId === provider.id)
    const isDirectOwner = scope?.roles.includes('owner') ?? false

    return <main className="min-h-full bg-background px-4 py-8 lg:px-8"><section className="mx-auto max-w-6xl"><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline"><ArrowLeft className="size-4" />{t('auth.accountMenuAllBranches')}</Link><PageHeader eyebrow={t('autocare.ownerProviderDetailsEyebrow')} title={provider.name} description={provider.description ?? t('common.notProvided')} /><div className="space-y-5"><ProviderOverview provider={provider} />{isDirectOwner ? <><OwnerProviderOnboardingPanel provider={provider} locale={locale} /><OwnerProviderEvidencePanel provider={provider} locale={locale} /><OwnerProviderCommunicationSettings provider={provider} locale={locale} /><OwnerProviderMembersPanel provider={provider} locale={locale} /><OwnerProviderBonusPanel provider={provider} locale={locale} /></> : <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-sm">{locale === 'ru' ? 'Ваш доступ ограничен назначенной ролью и филиалом. Управление профилем, командой и бонусной программой доступно владельцу сервиса.' : 'Your access is limited to the assigned role and branch. Profile, team and bonus programme management are available to the service owner.'}</section>}</div></section></main>
}

function ProviderOverview({ provider }: { provider: AutoCareApiProvider }) {
    const { t } = useTranslation()
    const stats = [
        { icon: Star, label: t('autocare.ownerProviderRating'), value: provider.rating.toFixed(1) },
        { icon: MessageSquareText, label: t('autocare.ownerProviderReviews'), value: String(provider.reviewCount) },
        { icon: UsersRound, label: t('autocare.ownerProviderStaffLabel'), value: String(provider.staffCount) },
        { icon: CalendarCheck2, label: t('autocare.ownerProviderYearsLabel'), value: String(provider.yearsActive) },
    ]

    const locations = provider.locations?.length ? provider.locations : [{ location: provider.location, offers: provider.offers ?? [] }]
    return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-5"><div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MapPin className="size-5" /></span><div><p className="text-sm font-black">{provider.location.address}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{provider.location.hours}</p></div></div>{locations.length > 1 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{locations.map((branch) => <div key={branch.location.id} className="rounded-[var(--radius-card)] border border-border bg-background px-3 py-2"><p className="text-xs font-black text-foreground">{branch.location.address}</p><p className="mt-1 text-[11px] font-semibold text-muted-foreground">{branch.location.hours} · {branch.offers.length} {t('autocare.ownerProviderOffersLabel')}</p></div>)}</div>}<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(({ icon: Icon, label, value }) => <div key={label} className="rounded-[var(--radius-card)] bg-secondary p-3"><Icon className="size-4 text-primary" /><p className="mt-3 text-xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>)}</div></div><div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-base font-black">{t('autocare.providerGalleryTitle')}</h2>{provider.coverImageUrl && <AutoCareImage src={provider.coverImageUrl} alt="" className="mt-4 h-40 w-full rounded-[var(--radius-card)] object-cover" />}{provider.galleryImageUrls.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{provider.galleryImageUrls.slice(0, 8).map((image) => <AutoCareImage key={image} src={image} alt="" className="aspect-square rounded-[var(--radius-card)] object-cover" />)}</div>}</div></div><aside className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><BarChart3 className="size-5" /></span><h2 className="text-base font-black">{t('autocare.ownerProviderStatsTitle')}</h2></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderStatsDescription')}</p><Link to={ROUTES.ownerDashboard} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground hover:bg-primary/90">{t('autocare.ownerProviderOpenDashboard')}</Link></aside></div>
}
