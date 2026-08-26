import { Building2, CalendarDays, CheckCircle2, Clock3, MapPin, MessageCircle, Phone, Settings2, ShieldCheck, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { automotiveAmenities, AutomotiveAmenityIcon, getAutomotiveAmenityLabel, ProviderLogo, type AutoCareApiProvider, type AutomotiveAmenity, useUpdateOwnerAutoCareCommunicationSettingsMutation, type UpdateAutoCareCommunicationSettingsInput } from '@/entities/automotive-service'
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

    return <div className="grid items-stretch gap-5 md:auto-rows-fr md:grid-cols-2">
        {providers.map((provider) => <OwnerAutoCareProviderCard key={provider.id} provider={provider} locale={locale} t={t} />)}
    </div>
}

function OwnerAutoCareProviderCard({ provider, locale, t }: { provider: AutoCareApiProvider; locale: string; t: (key: string, values?: Record<string, string | number>) => string }) {
    const ru = locale === 'ru'
    const amenities = provider.amenityIds.reduce<AutomotiveAmenity[]>((items, id) => {
        const amenity = automotiveAmenities.find((item) => item.id === id)
        return amenity ? [...items, amenity] : items
    }, [])
    const offer = provider.offers?.find((item) => item.active) ?? provider.offers?.[0]
    const warranty = provider.warrantyText || offer?.warrantyText || t('autocare.qualityGuarantee')
    const responseMinutes = provider.responseWindowMinutes ?? 240
    const responseLabel = responseMinutes < 120 ? (ru ? `${responseMinutes} мин` : `${responseMinutes} min`) : responseMinutes < 1440 ? (ru ? `${Math.round(responseMinutes / 60)} ч` : `${Math.round(responseMinutes / 60)} hr`) : (ru ? 'В течение дня' : 'Within a day')
    const priceLabel = offer ? new Intl.NumberFormat(ru ? 'ru-RU' : locale, { style: 'currency', currency: offer.currencyCode, maximumFractionDigits: 0 }).format(offer.priceFromMinor / 100) : null
    const chatEnabled = provider.chatEnabled !== false
    const modeLabel = provider.communicationMode === 'phone_only'
        ? (ru ? 'Только по телефону' : 'Phone only')
        : provider.communicationMode === 'request_then_confirm'
            ? (ru ? 'Заявка + подтверждение' : 'Request + confirmation')
            : (ru ? 'Онлайн-запись' : 'Online booking')

    return <article data-testid="owner-provider-card" className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md">
        <Link to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="flex flex-1 flex-col rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
            <header className="min-h-[132px] bg-hero-overlay px-4 py-4 text-primary-foreground md:px-5 md:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-12 shrink-0 rounded-xl md:size-14" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5"><h2 className="truncate text-lg font-black tracking-tight md:text-xl">{provider.name}</h2>{provider.verified && <ShieldCheck className="size-4 shrink-0 text-primary" aria-label={t('autocare.trustedBadge')} />}</div>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/75"><MapPin className="size-3.5 shrink-0" />{provider.location.address}</p>
                        </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${provider.status === 'active' ? 'bg-status-success-surface text-status-success-foreground' : 'bg-primary-foreground/10 text-primary-foreground/80'}`}><CheckCircle2 className="size-3" />{provider.status === 'active' ? t('autocare.ownerProviderPublished') : t('autocare.ownerProviderDraft')}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span className="inline-flex items-center gap-1 font-black text-rating-foreground"><Star className="size-3.5 fill-rating-fill" />{provider.rating.toFixed(1)}</span><span className="text-primary-foreground/60">·</span><span className="text-primary-foreground/75">{t('autocare.reviews', { count: provider.reviewCount })}</span><span className="text-primary-foreground/60">·</span><span className="text-primary-foreground/75">{provider.location.hours}</span></div>
            </header>
            <div className="flex flex-1 flex-col px-4 py-4 md:px-5 md:py-5">
                <p className="min-h-[72px] max-h-[72px] max-w-4xl overflow-hidden text-sm leading-6 text-foreground">{provider.description || t('common.notProvided')}</p>
                <div className="mt-4 grid min-h-[72px] grid-cols-3 items-center gap-2 border-y border-border py-4">
                    <ProviderStat icon={Star} value={provider.rating.toFixed(1)} label={t('autocare.ownerProviderRating')} />
                    <ProviderStat icon={Clock3} value={responseLabel} label={ru ? 'Среднее время ответа' : 'Response time'} />
                    <ProviderStat icon={ShieldCheck} value={warranty} label={ru ? 'Гарантия' : 'Warranty'} success wrapValue />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t('autocare.ownerProviderAmenitiesCount', { count: amenities.length })}</p>
                <div className="mt-3 flex min-h-[92px] flex-wrap content-start gap-2 overflow-hidden pb-4">{amenities.map((amenity) => <span key={amenity.id} className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-semibold leading-4 text-primary"><AutomotiveAmenityIcon amenityId={amenity.id} className="size-3.5 shrink-0" />{getAutomotiveAmenityLabel(amenity, locale)}</span>)}</div>
                {(priceLabel || provider.bonusSummary) && <div className="mt-auto flex min-h-[78px] flex-wrap items-end justify-between gap-3 border-t border-border pt-4"><div>{priceLabel && <><p className="text-xs text-muted-foreground">{ru ? 'Ориентировочная цена' : 'Estimated price'}</p><p className="mt-1 text-xl font-black text-primary">{ru ? 'от ' : 'from '}{priceLabel}</p></>}{provider.bonusSummary && <p className="mt-1 text-[11px] font-bold text-status-success-foreground">{provider.bonusSummary}</p>}</div><span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-primary px-3 py-2 text-xs font-black text-primary"><CalendarDays className="size-3.5" />{provider.communicationMode === 'phone_only' ? (ru ? 'Запись по телефону' : 'Phone booking') : (ru ? 'Открыть профиль' : 'Open profile')}</span></div>}
            </div>
        </Link>
        <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3 md:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 text-sm font-black text-foreground">{chatEnabled ? <MessageCircle className="size-4 text-primary" /> : <Phone className="size-4 text-primary" />}<span>{chatEnabled ? (ru ? 'Чаты включены' : 'Chats enabled') : (ru ? 'Чаты отключены' : 'Chats disabled')}</span><span className="sr-only">{modeLabel}</span></span><OwnerProviderChatQuickSwitch provider={provider} locale={locale} /></div>
            <Link data-testid="owner-provider-communication-link" to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary/40 px-3.5 py-2 text-sm font-black text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings2 className="size-4" />{ru ? 'Настроить связь' : 'Contact settings'}</Link>
        </div>
    </article>
}

function ProviderStat({ icon: Icon, value, label, success = false, wrapValue = false }: { icon: typeof Star; value: string; label: string; success?: boolean; wrapValue?: boolean }) {
    return <div className="flex min-w-0 items-center gap-1.5"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${success ? 'bg-status-success-surface text-status-success-foreground' : 'bg-primary/10 text-primary'}`}><Icon className="size-4" /></span><div className="min-w-0"><p className={wrapValue ? 'break-words text-sm font-black leading-4 text-foreground' : 'truncate text-base font-black text-foreground'}>{value}</p><p className="truncate text-[10px] font-semibold text-muted-foreground">{label}</p></div></div>
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

    return <CommunicationSwitch id={`owner-list-chat-${provider.id}`} compact inline hideLabel checked={enabled} disabled={disabled} onChange={(event) => void handleChange(event.target.checked)} label={ru ? 'Чаты' : 'Chat'} />
}
