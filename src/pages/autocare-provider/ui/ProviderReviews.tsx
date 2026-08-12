import { Star } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function ProviderReviews({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()

    return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><div className="mt-3 flex items-center gap-3"><strong className="text-3xl font-black text-foreground">{provider.rating}</strong><span className="grid gap-1"><span className="flex gap-0.5 text-rating-fill">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-3.5 fill-rating-fill" />)}</span><span className="text-xs font-medium text-muted-foreground">{t('autocare.reviews', { count: provider.reviewCount })}</span></span></div></div><span className="rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground">{t('autocare.providerProfile')}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{provider.reviews.map((review) => <article key={review.id} className="rounded-[var(--radius-card)] border border-border bg-background p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-foreground">{review.author}</p><span className="flex gap-0.5 text-rating-fill"><Star className="size-3 fill-rating-fill" />{review.rating}</span></div><p className="mt-3 text-xs font-medium leading-5 text-muted-foreground">{review.text}</p><p className="mt-3 text-[11px] font-medium text-muted-foreground">{review.date}</p></article>)}</div>{provider.reviews.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t('autocare.providerNoReviews')}</p>}</section>
}
