import { Building2, MapPin, MessageCircle, Phone, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { automotiveAmenities, getAutomotiveAmenityLabel, ProviderLogo, type AutoCareApiProvider, type AutomotiveAmenity, useUpdateOwnerAutoCareCommunicationSettingsMutation, type UpdateAutoCareCommunicationSettingsInput } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { routePaths } from '@/shared/constants/routes'
import { CommunicationSwitch } from '@/shared/ui/communication-switch'

type CommunicationSettings = Omit<UpdateAutoCareCommunicationSettingsInput, 'providerId'>

function getCommunicationSettings(provider: AutoCareApiProvider): CommunicationSettings {
    return {
        teamSize: provider.teamSize ?? 'small_team',
        businessType: provider.businessType ?? 'company',
        chatEnabled: provider.chatEnabled ?? true,
        communicationMode: provider.communicationMode ?? 'online',
        responseWindowMinutes: provider.responseWindowMinutes ?? 240,
        responseHours: provider.responseHours ?? 'working_hours',
        phoneBookingEnabled: provider.phoneBookingEnabled ?? true,
        callbackEnabled: provider.callbackEnabled ?? true,
        requestPhotosEnabled: provider.requestPhotosEnabled ?? true,
        publicContactNote: provider.publicContactNote ?? null,
    }
}

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
            const chatEnabled = provider.chatEnabled !== false
            const mode = provider.communicationMode ?? 'online'
            const modeLabel = mode === 'phone_only'
                ? (locale === 'ru' ? 'Только по телефону' : 'Phone only')
                : mode === 'request_then_confirm'
                    ? (locale === 'ru' ? 'Заявка + подтверждение' : 'Request + confirmation')
                    : (locale === 'ru' ? 'Онлайн-запись' : 'Online booking')
            return <article key={provider.id} data-testid="owner-provider-card" className="rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary hover:shadow-md">
                <Link to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-10 shrink-0" /><div className="min-w-0"><h2 className="truncate font-bold">{provider.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />{provider.location.address}</p></div></div><span className="shrink-0 rounded-full bg-status-warning-surface px-2.5 py-1 text-xs font-bold text-status-warning-foreground">{provider.status === 'active' ? t('autocare.ownerProviderPublished') : t('autocare.ownerProviderDraft')}</span></div>
                    <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{provider.description || t('common.notProvided')}</p><p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('autocare.ownerProviderAmenitiesCount', { count: amenities.length })}</p><div className="mt-2 flex flex-wrap gap-1.5">{amenities.map((amenity) => <span key={amenity.id} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{getAutomotiveAmenityLabel(amenity, locale)}</span>)}</div>
                </Link>
                <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs font-bold sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground"><MessageCircle className="size-3.5 text-primary" />{chatEnabled ? (locale === 'ru' ? 'Чаты включены' : 'Chat enabled') : (<><Phone className="size-3.5 text-primary" />{locale === 'ru' ? 'Связь по телефону' : 'Phone contact'}<span className="sr-only">{modeLabel}</span></>)}</span>
                        <OwnerProviderChatQuickSwitch provider={provider} locale={locale} />
                    </div>
                    <Link data-testid="owner-provider-communication-link" to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/35 px-3 py-1.5 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-self-end"><Settings2 className="size-3.5" />{locale === 'ru' ? 'Настроить связь' : 'Contact settings'}</Link>
                </div>
            </article>
        })}
    </div>
}

function OwnerProviderChatQuickSwitch({ provider, locale }: { provider: AutoCareApiProvider; locale: string }) {
    const ru = locale === 'ru'
    const [enabled, setEnabled] = useState(provider.chatEnabled !== false && provider.communicationMode !== 'phone_only')
    const [update, state] = useUpdateOwnerAutoCareCommunicationSettingsMutation()
    const disabled = provider.communicationMode === 'phone_only' || state.isLoading

    const handleChange = async (value: boolean) => {
        if (disabled) return
        const previous = enabled
        setEnabled(value)
        try {
            await update({ providerId: provider.id, ...getCommunicationSettings(provider), chatEnabled: value }).unwrap()
            toast.success(ru ? 'Чат обновлён.' : 'Chat updated.')
        } catch (error) {
            setEnabled(previous)
            toast.error(getApiErrorMessage(error, ru ? 'Не удалось обновить чат.' : 'Could not update chat.'))
        }
    }

    return <CommunicationSwitch id={`owner-list-chat-${provider.id}`} compact inline checked={enabled} disabled={disabled} onChange={(event) => void handleChange(event.target.checked)} label={ru ? 'Чаты' : 'Chat'} />
}
