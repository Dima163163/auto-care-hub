import { BadgeCheck, CarFront, Clock3, Settings2, Wrench } from 'lucide-react'
import { Link } from 'react-router'

import {
    useGetAutoCareServiceDefinitionsQuery,
    useGetOwnerAutoCareProvidersQuery,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const copy = {
    en: {
        eyebrow: 'Automotive service catalogue',
        title: 'Services and pricing',
        description: 'Use standard AutoCare service definitions so customers can compare like-for-like work, prices and warranty terms.',
        locations: 'Service locations',
        definitions: 'Standard services',
        categories: 'Categories',
        locationAction: 'Manage locations',
        notice: 'Offer editing and price publishing are attached to each service location. Choose a location to continue.',
        from: 'From price',
        estimate: 'Estimate on request',
    },
    ru: {
        eyebrow: 'Каталог автоуслуг',
        title: 'Услуги и цены',
        description: 'Используйте единые определения AutoCare, чтобы клиенты честно сравнивали одинаковые работы, цены и условия гарантии.',
        locations: 'Точки сервиса',
        definitions: 'Стандартные услуги',
        categories: 'Категории',
        locationAction: 'Управлять точками',
        notice: 'Настройка предложений и цен привязана к каждой точке сервиса. Выберите точку, чтобы продолжить.',
        from: 'Цена от',
        estimate: 'Оценка по запросу',
    },
}

export function OwnerServicesPage() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const definitions = useGetAutoCareServiceDefinitionsQuery()
    const providers = useGetOwnerAutoCareProvidersQuery()
    const error = definitions.error ?? providers.error
    const isLoading = definitions.isLoading || providers.isLoading
    const services = definitions.data ?? []
    const categories = new Set(services.map((service) => service.categorySlug))

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section className="mx-auto max-w-6xl space-y-5">
                <section className="rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.18),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8">
                    <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Wrench className="size-4" />{text.eyebrow}</p>
                    <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div className="max-w-2xl"><h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{text.title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{text.description}</p></div>
                        <Link to={ROUTES.ownerAutoCareProviders} className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground"><Settings2 className="size-4" />{text.locationAction}</Link>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={CarFront} label={text.locations} value={providers.data?.length ?? 0} /><Metric icon={BadgeCheck} label={text.definitions} value={services.length} /><Metric icon={Clock3} label={text.categories} value={categories.size} /></div>
                </section>

                {isLoading && <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm font-semibold text-muted-foreground">{t('common.loading')}</div>}
                {error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={() => void Promise.all([definitions.refetch(), providers.refetch()])} label={t('common.retry')} /></div>}
                {!isLoading && !error && <><p className="rounded-[var(--radius-card)] border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-muted-foreground">{text.notice}</p><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{services.map((service) => <article key={service.id} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{service.priceType === 'quote_required' ? text.estimate : text.from}</span></div><h2 className="mt-5 text-base font-black text-foreground">{service.labels[locale] ?? service.labels.en ?? service.slug}</h2><p className="mt-2 text-xs font-bold text-muted-foreground">{service.comparisonAttributes.join(' · ')}</p></article>)}</section></>}
            </section>
        </main>
    )
}

function Metric({ icon: Icon, label, value }: { icon: typeof CarFront; label: string; value: number }) {
    return <article className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-3"><Icon className="size-5 text-primary" /><p className="mt-2 text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black text-foreground">{value}</p></article>
}
