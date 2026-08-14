import { BadgeCheck, CarFront, ChevronDown, Clock3, Eye, EyeOff, Settings2, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { useMemo, useState } from 'react'

import { useGetAutoCareServiceDefinitionsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

import { OwnerBranchServices } from './OwnerBranchServices'

const copy = {
    en: {
        eyebrow: 'Automotive service catalogue', title: 'Services and pricing', description: 'Manage offers separately for each service location so customers always see the right price and availability.', locations: 'Service locations', definitions: 'Standard services', categories: 'Categories', locationAction: 'Manage locations', notice: 'Choose a service location to view and manage its published offers. Click the branch header to expand or collapse its services.', showAll: 'Show all services', hideAll: 'Hide all services', branchServices: 'services', address: 'Address', hours: 'Hours', reviews: 'reviews', from: 'From price', estimate: 'Estimate on request', noPublished: 'No published offers for this branch yet.',
    },
    ru: {
        eyebrow: 'Каталог автоуслуг', title: 'Услуги и цены', description: 'Настраивайте предложения отдельно для каждого филиала, чтобы клиент всегда видел актуальные цены и доступность.', locations: 'Филиалы сервиса', definitions: 'Стандартные услуги', categories: 'Категории', locationAction: 'Управлять филиалами', notice: 'Выберите филиал, чтобы посмотреть его опубликованные предложения. Нажмите на шапку филиала, чтобы раскрыть или скрыть услуги.', showAll: 'Показать все услуги', hideAll: 'Скрыть все услуги', branchServices: 'услуг', address: 'Адрес', hours: 'График', reviews: 'отзывов', from: 'Цена от', estimate: 'Цена по запросу', noPublished: 'В этом филиале пока нет опубликованных предложений.',
    },
}

export function OwnerServicesPage() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const definitions = useGetAutoCareServiceDefinitionsQuery()
    const providers = useGetOwnerAutoCareProvidersQuery()
    const [collapsedBranchIds, setCollapsedBranchIds] = useState<Set<string>>(new Set())
    const services = definitions.data ?? []
    const providerList = useMemo(() => providers.data ?? [], [providers.data])
    const categories = new Set(services.map((service) => service.categorySlug))
    const allOpen = providerList.length > 0 && collapsedBranchIds.size === 0
    const publishedOffers = useMemo(() => providerList.reduce((total, provider) => total + (provider.offers?.length ?? 0), 0), [providerList])

    const toggleBranch = (providerId: string) => setCollapsedBranchIds((current) => {
        const next = new Set(current)
        if (next.has(providerId)) next.delete(providerId)
        else next.add(providerId)
        return next
    })
    const toggleAll = () => setCollapsedBranchIds(allOpen ? new Set(providerList.map((provider) => provider.id)) : new Set())

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section className="mx-auto max-w-6xl space-y-5">
                <section className="rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.18),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Wrench className="size-4" />{text.eyebrow}</p>
                    <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div className="max-w-2xl"><h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{text.title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p></div>
                        <Link to={ROUTES.ownerAutoCareProviders} className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground"><Settings2 className="size-4" />{text.locationAction}</Link>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={CarFront} label={text.locations} value={providerList.length} /><Metric icon={BadgeCheck} label={text.definitions} value={services.length} /><Metric icon={Clock3} label={text.categories} value={categories.size} /></div>
                </section>

                {definitions.isLoading || providers.isLoading ? <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm font-semibold text-muted-foreground">{t('common.loading')}</div> : null}
                {definitions.error || providers.error ? <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(definitions.error ?? providers.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void Promise.all([definitions.refetch(), providers.refetch()])} label={t('common.retry')} /></div> : null}
                {!definitions.isLoading && !providers.isLoading && !definitions.error && !providers.error ? <><div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-primary/15 bg-primary/5 px-4 py-3"><p className="text-sm font-semibold text-muted-foreground">{text.notice}</p><button type="button" onClick={toggleAll} disabled={providerList.length === 0} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-primary/25 bg-background px-3 text-xs font-black text-primary disabled:opacity-50">{allOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{allOpen ? text.hideAll : text.showAll}<ChevronDown className={`size-3.5 transition-transform ${allOpen ? 'rotate-180' : ''}`} /></button></div><div className="space-y-4">{providerList.map((provider) => <OwnerBranchServices key={provider.id} provider={provider} definitions={services} locale={locale} labels={text} isOpen={!collapsedBranchIds.has(provider.id)} onToggle={() => toggleBranch(provider.id)} />)}</div>{providerList.length > 0 && <p className="text-xs font-semibold text-muted-foreground">{publishedOffers} {text.branchServices} · {providerList.length} {text.locations.toLowerCase()}</p>}</> : null}
            </section>
        </main>
    )
}

function Metric({ icon: Icon, label, value }: { icon: typeof CarFront; label: string; value: number }) {
    return <article className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-3"><Icon className="size-5 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black text-foreground">{value}</p></article>
}
