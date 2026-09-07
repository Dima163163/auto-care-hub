import { ArrowRight, BadgeCheck, MapPin, Plus, Star } from 'lucide-react'
import { Link } from 'react-router'

import { ProviderLogo } from '@/entities/automotive-service'
import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerAutoCareBranchPanelProps = { providers: AutoCareApiProvider[] }

export function OwnerAutoCareBranchPanel({ providers }: OwnerAutoCareBranchPanelProps) {
    const { t } = useTranslation()
    const statusLabels = { active: t('autocare.ownerDashboardBranchActive'), draft: t('autocare.ownerDashboardBranchDraft'), suspended: t('autocare.ownerDashboardBranchSuspended') }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black text-foreground">{t('autocare.ownerDashboardBranchTitle')}</h2><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><Plus className="size-3.5" />{t('autocare.ownerDashboardBranchAdd')}</Link></div>{providers.length ? <div className="mt-5 space-y-3">{providers.slice(0, 4).map((provider) => <Link key={provider.id} to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border p-3 transition hover:border-primary/50 hover:bg-primary/5"><ProviderLogo name={provider.name} logoUrl={provider.logoUrl} className="size-10" /><span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate text-sm font-black text-foreground">{provider.name}{provider.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}</span><span className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3" />{provider.location.address}</span></span><span className="text-right"><span className="flex items-center justify-end gap-1 text-xs font-black text-status-warning-foreground"><Star className="size-3 fill-current" />{provider.rating.toFixed(1)}</span><span className="mt-1 block text-[11px] font-bold text-muted-foreground">{statusLabels[provider.status]}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div> : <div className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{t('autocare.ownerDashboardBranchEmpty')}</div>}</section>
}
