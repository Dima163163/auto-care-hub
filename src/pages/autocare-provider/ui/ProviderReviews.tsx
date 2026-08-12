import { ChevronDown, Star } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type SelectOption = { value: string; label: string }
const scoreRows = [
    { score: 5, value: 84 },
    { score: 4, value: 12 },
    { score: 3, value: 3 },
    { score: 2, value: 1 },
    { score: 1, value: 1 },
]

export function ProviderReviews({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()
    const ratingOptions = [{ value: 'all', label: t('autocare.providerAllRatings') }]
    const serviceOptions = [{ value: 'all', label: t('autocare.providerAllServices') }]
    const sortOptions = [{ value: 'date', label: t('autocare.providerSortByDate') }]

    return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><div className="flex flex-wrap gap-2"><ReviewSelect options={ratingOptions} /><ReviewSelect options={serviceOptions} /><ReviewSelect options={sortOptions} /></div></div><div className="mt-5 grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]"><ReviewScore provider={provider} /><div className="grid gap-3 sm:grid-cols-2">{provider.reviews.map((review) => <article key={review.id} className="rounded-[var(--radius-card)] border border-border bg-background p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-foreground">{review.author}</p><span className="inline-flex items-center gap-1 text-xs font-black text-rating-fill"><Star className="size-3 fill-rating-fill" />{review.rating.toFixed(1)}</span></div><p className="mt-3 text-xs font-medium leading-5 text-muted-foreground">{review.text}</p><p className="mt-3 text-[11px] font-medium text-muted-foreground">{review.date}</p></article>)}</div></div>{provider.reviews.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t('autocare.providerNoReviews')}</p> : null}</section>
}

function ReviewScore({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()
    return <div className="rounded-[var(--radius-card)] bg-secondary p-3"><div className="flex items-center gap-3"><div><strong className="block text-3xl font-black text-foreground">{provider.rating}</strong><span className="mt-1 flex gap-0.5 text-rating-fill">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-3 fill-rating-fill" />)}</span><span className="mt-1 block text-[10px] font-semibold text-muted-foreground">{t('autocare.reviews', { count: provider.reviewCount })}</span></div><div className="min-w-0 flex-1 space-y-1">{scoreRows.map((row) => <div key={row.score} className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground"><span className="w-4">{row.score}★</span><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-rating-fill" style={{ width: `${row.value}%` }} /></span></div>)}</div></div></div>
}

function ReviewSelect({ options }: { options: readonly SelectOption[] }) {
    return <label className="relative"><select className="h-9 appearance-none rounded-[var(--radius-control)] border border-border bg-background py-0 pl-3 pr-8 text-xs font-semibold text-muted-foreground outline-none focus:border-primary" defaultValue={options[0]?.value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /></label>
}
