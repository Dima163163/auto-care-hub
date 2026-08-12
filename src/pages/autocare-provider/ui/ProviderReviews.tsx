import { Star } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function ProviderReviews({ provider }: { provider: ProviderProfile }) {
    const { t } = useTranslation()

    return <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 sm:p-6"><h2 className="text-2xl font-black tracking-tight text-foreground">{t('autocare.providerReviews')}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{provider.reviews.map((review) => <article key={review.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-foreground">{review.author}</p><span className="text-xs font-medium text-muted-foreground">{review.date}</span></div><div className="mt-2 flex items-center gap-1 text-xs font-bold"><Star className="size-3.5 fill-rating-fill text-rating-foreground" />{review.rating}</div><p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">{review.text}</p></article>)}</div>{provider.reviews.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t('autocare.providerNoReviews')}</p>}</section>
}
