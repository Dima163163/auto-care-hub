import { Building2, MapPin } from 'lucide-react'

import { automotiveAmenities, getAutomotiveAmenityLabel, ProviderLogo, type AutoCareApiProvider, type AutomotiveAmenity } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerAutoCareProviderListProps = {
    providers: AutoCareApiProvider[]
}

export function OwnerAutoCareProviderList({ providers }: OwnerAutoCareProviderListProps) {
    const { locale, t } = useTranslation()

    if (providers.length === 0) {
        return <div className="rounded-xl border border-dashed bg-card p-6 text-center"><Building2 className="mx-auto size-7 text-primary" /><h2 className="mt-3 font-bold">{t('autocare.ownerProviderEmptyTitle')}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderEmptyDescription')}</p></div>
    }

    return <div className="grid gap-3 md:grid-cols-2">
        {providers.map((provider) => {
            const amenities = provider.amenityIds.reduce<AutomotiveAmenity[]>((items, id) => {
                const amenity = automotiveAmenities.find((item) => item.id === id)
                return amenity ? [...items, amenity] : items
            }, [])
            return <article key={provider.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-10 shrink-0" /><div className="min-w-0"><h2 className="truncate font-bold">{provider.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{provider.location.address}</p></div></div><span className="shrink-0 rounded-full bg-status-warning-surface px-2.5 py-1 text-xs font-bold text-status-warning-foreground">{provider.status === 'active' ? t('autocare.ownerProviderPublished') : t('autocare.ownerProviderDraft')}</span></div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{provider.description || t('common.notProvided')}</p><p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('autocare.ownerProviderAmenitiesCount', { count: amenities.length })}</p><div className="mt-2 flex flex-wrap gap-1.5">{amenities.map((amenity) => <span key={amenity.id} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{getAutomotiveAmenityLabel(amenity, locale)}</span>)}</div></article>
        })}
    </div>
}
