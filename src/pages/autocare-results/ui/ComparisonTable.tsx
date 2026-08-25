import { BadgeCheck, Clock3, MapPin, ShieldCheck, Star } from 'lucide-react'

import type { ProviderPreview } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type ComparisonTableProps = { providers: readonly ProviderPreview[] }

export function ComparisonTable({ providers }: ComparisonTableProps) {
    const { t } = useTranslation()
    if (providers.length < 2) return null

    const rows = [
        { label: t('autocare.comparisonPrice'), icon: null, value: (provider: ProviderPreview) => formatMoney(provider.price, provider.currency) },
        { label: t('autocare.comparisonRating'), icon: Star, value: (provider: ProviderPreview) => `${provider.rating.toFixed(1)} (${provider.reviewCount})` },
        { label: t('autocare.comparisonDistance'), icon: MapPin, value: (provider: ProviderPreview) => provider.distance },
        { label: t('autocare.comparisonNextSlot'), icon: Clock3, value: (provider: ProviderPreview) => provider.nextSlot },
        { label: t('autocare.comparisonWarranty'), icon: ShieldCheck, value: (provider: ProviderPreview) => provider.warrantyMonths ? t('autocare.warrantyMonths', { count: provider.warrantyMonths }) : t('common.notProvided') },
        { label: t('autocare.comparisonVerification'), icon: BadgeCheck, value: (provider: ProviderPreview) => provider.verified ? t('autocare.trustedBadge') : t('common.notProvided') },
    ] as const

    return <section aria-label={t('autocare.comparisonTableTitle')} className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="text-base font-black text-foreground">{t('autocare.comparisonTableTitle')}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{t('autocare.comparisonTableDescription')}</p></div><div className="overflow-x-auto"><table className="min-w-[640px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-border bg-secondary/50"><th scope="col" className="w-36 px-4 py-3 font-bold text-muted-foreground sm:px-5">{t('autocare.comparisonParameter')}</th>{providers.map((provider) => <th scope="col" key={provider.id} className="min-w-36 px-4 py-3 font-black text-foreground sm:px-5">{provider.name}</th>)}</tr></thead><tbody>{rows.map(({ label, icon: Icon, value }) => <tr key={label} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-3 font-bold text-muted-foreground sm:px-5"><span className="inline-flex items-center gap-1.5">{Icon && <Icon className="size-3.5 text-primary" />}{label}</span></th>{providers.map((provider) => <td key={provider.id} className="px-4 py-3 font-semibold text-foreground sm:px-5">{value(provider)}</td>)}</tr>)}</tbody></table></div></section>
}

function formatMoney(value: number, currency: string) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}
