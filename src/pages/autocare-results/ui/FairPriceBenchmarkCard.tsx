import { BarChart3, Info } from 'lucide-react'

import { useGetAutoCareFairPriceQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type FairPriceBenchmarkCardProps = {
    serviceId: string
    marketId?: string
}

function formatMoney(valueMinor: number, currencyCode: string, locale: string) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(valueMinor / 100)
}

export function FairPriceBenchmarkCard({ serviceId, marketId }: FairPriceBenchmarkCardProps) {
    const { locale } = useTranslation()
    const { data, isLoading } = useGetAutoCareFairPriceQuery({ serviceId, marketId })
    if (isLoading || !data) return null
    const copy = locale === 'ru'
        ? { title: 'Ориентир честной цены', min: 'от', median: 'обычная цена', max: 'до', note: 'Рассчитано по опубликованным предложениям сервисов. Финальная сумма зависит от диагностики.', sample: 'проверенных предложений', source: 'Источник' }
        : { title: 'Fair price benchmark', min: 'from', median: 'typical price', max: 'up to', note: 'Based on published provider offers. The final amount depends on inspection.', sample: 'verified offers', source: 'Source' }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><BarChart3 className="size-4" /></span><div className="min-w-0"><h2 className="text-sm font-black text-foreground">{copy.title}</h2><p className="mt-1 text-xs text-muted-foreground">{copy.note}</p></div><Info className="ml-auto size-4 shrink-0 text-muted-foreground" /></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-[var(--radius-control)] bg-background p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{copy.min}</p><p className="mt-1 text-sm font-black text-foreground">{formatMoney(data.minPriceMinor, data.currencyCode, locale)}</p></div><div className="rounded-[var(--radius-control)] border border-primary/30 bg-primary/5 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-primary">{copy.median}</p><p className="mt-1 text-sm font-black text-foreground">{formatMoney(data.medianPriceMinor, data.currencyCode, locale)}</p></div><div className="rounded-[var(--radius-control)] bg-background p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{copy.max}</p><p className="mt-1 text-sm font-black text-foreground">{formatMoney(data.maxPriceMinor, data.currencyCode, locale)}</p></div></div><p className="mt-3 text-[11px] font-medium text-muted-foreground">{copy.source}: {data.source} · {String(data.methodology.sampleSize ?? '—')} {copy.sample}</p></section>
}
