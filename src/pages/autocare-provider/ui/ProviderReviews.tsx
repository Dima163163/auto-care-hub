import { ChevronDown, Star } from 'lucide-react'
import { useState } from 'react'

import type { ProviderReview, ProviderProfile } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

type SelectOption = { value: string; label: string }
type ReviewCardProps = { review: ProviderReview; index: number }

const scoreRows = [
    { score: 5, value: 84 }, { score: 4, value: 12 }, { score: 3, value: 3 }, { score: 2, value: 1 }, { score: 1, value: 1 },
]
const reviewAvatars = ['/images/autocare/avatars/alexey.webp', '/images/autocare/avatars/maria.webp', '/images/autocare/avatars/igor.webp']
const reviewVehicles = ['BMW X5', 'Toyota Camry', 'Audi Q5']

export function ProviderReviews({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()
    const selectors = [
        [{ value: 'all', label: t('autocare.providerAllRatings') }, { value: '5', label: '5 ★' }],
        [{ value: 'all', label: t('autocare.providerAllServices') }],
        [{ value: 'date', label: t('autocare.providerSortByDate') }],
    ] as const

    return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><div className="flex flex-wrap gap-2">{selectors.map((options) => <ReviewSelect key={options[0].value} options={options} />)}</div></header><div className="mt-4"><ReviewScore provider={provider} /></div><div className="mt-4 grid gap-3 md:grid-cols-3">{provider.reviews.map((review, index) => <ReviewCard key={review.id} review={review} index={index} />)}</div>{provider.reviews.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t('autocare.providerNoReviews')}</p> : <button type="button" className="mx-auto mt-4 inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border px-6 py-2 text-xs font-bold text-primary transition hover:border-primary"><span>{t('autocare.providerShowAllReviews', { count: provider.reviewCount })}</span><ChevronDown className="size-3.5" /></button>}</section>
}

function ReviewScore({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()
    return <div className="flex w-full max-w-52 items-center gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3"><div className="shrink-0"><strong className="block text-3xl font-black text-foreground">{provider.rating}</strong><span className="mt-1 flex gap-0.5 text-rating-fill">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-3 fill-rating-fill" />)}</span><span className="mt-1 block text-[10px] font-semibold text-muted-foreground">{t('autocare.reviews', { count: provider.reviewCount })}</span></div><div className="min-w-0 flex-1 space-y-1">{scoreRows.map((row) => <div key={row.score} className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground"><span className="w-4">{row.score} ★</span><span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-rating-fill" style={{ width: `${row.value}%` }} /></span></div>)}</div></div>
}

function ReviewCard({ review, index }: ReviewCardProps) {
    const { t } = useTranslation()
    const avatar = reviewAvatars[index % reviewAvatars.length]
    const vehicle = reviewVehicles[index % reviewVehicles.length]
    return <article className="min-h-36 rounded-[var(--radius-card)] border border-border bg-background p-3.5"><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><AutoCareImage src={avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" /><p className="min-w-0 text-[11px] font-black leading-4 text-foreground"><span className="block truncate">{review.author}</span><span className="block font-semibold text-muted-foreground">{vehicle}</span></p></div><span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-rating-fill"><Star className="size-3 fill-rating-fill" />{review.rating.toFixed(1)}</span></div><p className="mt-3 text-[11px] font-medium leading-4 text-muted-foreground">{review.text}</p><button type="button" className="mt-3 text-[10px] font-bold text-primary">{t('autocare.providerReviewService')}</button><p className="mt-2 text-[10px] font-medium text-muted-foreground">{review.date}</p></article>
}

function ReviewSelect({ options }: { options: readonly SelectOption[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedOption, setSelectedOption] = useState(options[0])

    if (!selectedOption) return null

    return <div className="relative"><button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)} className="inline-flex h-8 min-w-25 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-background py-0 pl-3 pr-2 text-[10px] font-semibold text-foreground outline-none transition hover:border-primary focus:border-primary"><span>{selectedOption.label}</span><ChevronDown className={`size-3.5 shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen ? <div role="listbox" className="absolute right-0 z-10 mt-1 min-w-full overflow-hidden rounded-[var(--radius-control)] border border-border bg-card py-1 shadow-lg">{options.map((option) => <button key={option.value} role="option" type="button" aria-selected={option.value === selectedOption.value} onClick={() => { setSelectedOption(option); setIsOpen(false) }} className="block w-full whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold text-foreground hover:bg-secondary">{option.label}</button>)}</div> : null}</div>
}
