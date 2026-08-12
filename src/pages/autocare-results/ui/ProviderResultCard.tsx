import { BadgeCheck, Check, Clock3, MapPin, MessageCircle, Star } from 'lucide-react'
import { Link } from 'react-router'

import type { ProviderPreview } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

type ProviderResultCardProps = {
    provider: ProviderPreview
    selected: boolean
    onToggle: () => void
}

export function ProviderResultCard({ provider, selected, onToggle }: ProviderResultCardProps) {
    const { t } = useTranslation()
    const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: provider.currency, maximumFractionDigits: 0 }).format(provider.price)

    return <article className={`rounded-[var(--radius-card)] border bg-card p-4 shadow-sm transition ${selected ? 'border-primary ring-2 ring-ring/30' : 'border-border hover:border-primary/50'}`}><div className="flex gap-4"><Link to={routePaths.serviceProviderDetails(provider.id)} className="shrink-0"><AutoCareImage src={provider.image} alt={provider.name} className="size-24 rounded-[var(--radius-control)] object-cover sm:size-32" /></Link><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link to={routePaths.serviceProviderDetails(provider.id)} className="font-black text-foreground hover:text-primary">{provider.name}</Link>{provider.verified && <span className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-1 text-[11px] font-bold text-status-success-foreground"><BadgeCheck className="size-3.5" />{t('autocare.trustedBadge')}</span>}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-rating-fill text-rating-foreground" />{provider.rating}</span><span className="font-medium text-muted-foreground">{t('autocare.reviews', { count: provider.reviewCount })}</span><span className="font-medium text-muted-foreground">· {provider.distance}</span></div></div><button type="button" onClick={onToggle} aria-pressed={selected} className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`} aria-label={t('autocare.compareAction')}><Check className="size-4" /></button></div><div className="mt-4 grid gap-2 text-xs font-semibold text-muted-foreground sm:grid-cols-2"><span className="inline-flex items-center gap-2"><MapPin className="size-3.5 text-primary" />{provider.distance}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-3.5 text-primary" />{provider.nextSlot}</span></div><div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4"><div><p className="text-sm font-black text-foreground">{t('autocare.fromPrice', { price })}</p>{provider.bonus && <p className="mt-1 text-xs font-bold text-status-success-foreground">{t('autocare.bonusLabel')}: {provider.bonus}</p>}</div><div className="flex gap-2"><Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground hover:border-primary hover:text-primary"><MessageCircle className="size-3.5" />{t('autocare.messageAction')}</Link><Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90">{t('autocare.bookAction')}</Link></div></div></div></div></article>
}
