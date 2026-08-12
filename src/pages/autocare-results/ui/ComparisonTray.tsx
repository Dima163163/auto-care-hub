import { ArrowRight, X } from 'lucide-react'

import type { ProviderPreview } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type ComparisonTrayProps = {
    providers: readonly ProviderPreview[]
    onRemove: (id: string) => void
    onCompare: () => void
}

export function ComparisonTray({ providers, onRemove, onCompare }: ComparisonTrayProps) {
    const { t } = useTranslation()

    if (providers.length === 0) return null

    return <aside className="sticky bottom-3 z-10 mt-6 rounded-[var(--radius-panel)] border border-primary/30 bg-hero-overlay p-4 text-primary-foreground shadow-2xl shadow-black/20"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black">{t('autocare.compareSelected', { count: providers.length })}</p><p className="mt-1 text-xs font-medium text-primary-foreground/70">{t('autocare.compareDescription')}</p></div><button type="button" onClick={onCompare} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90">{t('autocare.compareAction')}<ArrowRight className="size-4" /></button></div><div className="mt-3 flex flex-wrap gap-2">{providers.map((provider) => <span key={provider.id} className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold">{provider.name}<button type="button" onClick={() => onRemove(provider.id)} aria-label={`${t('autocare.clearCompare')}: ${provider.name}`}><X className="size-3.5" /></button></span>)}</div></aside>
}
