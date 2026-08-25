import { MessageCircle, Phone, RotateCw, Camera } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useGetOwnerAutoCareProvidersQuery, useUpdateOwnerAutoCareCommunicationSettingsMutation, type AutoCareApiProvider, type UpdateAutoCareCommunicationSettingsInput } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { CommunicationSwitch } from '@/shared/ui/communication-switch'

type Settings = Omit<UpdateAutoCareCommunicationSettingsInput, 'providerId'>
type SwitchKey = 'chatEnabled' | 'phoneBookingEnabled' | 'callbackEnabled' | 'requestPhotosEnabled'

function getSettings(provider: AutoCareApiProvider): Settings {
    return { teamSize: provider.teamSize ?? 'small_team', businessType: provider.businessType ?? 'company', chatEnabled: provider.chatEnabled ?? true, communicationMode: provider.communicationMode ?? 'online', responseWindowMinutes: provider.responseWindowMinutes ?? 240, responseHours: provider.responseHours ?? 'working_hours', phoneBookingEnabled: provider.phoneBookingEnabled ?? true, callbackEnabled: provider.callbackEnabled ?? true, requestPhotosEnabled: provider.requestPhotosEnabled ?? true, publicContactNote: provider.publicContactNote ?? null }
}

export function OwnerCommunicationProfileSettings() {
    const { locale } = useTranslation()
    const ru = locale === 'ru'
    const { data: providers = [], isLoading } = useGetOwnerAutoCareProvidersQuery()
    if (isLoading || providers.length === 0) return null
    return <section data-testid="owner-profile-communication-settings" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageCircle className="size-5" /></span><div><h2 className="text-base font-black">{ru ? 'Связь с клиентами' : 'Customer communication'}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{ru ? 'Быстро включайте чат, запись по телефону и дополнительные способы связи для каждого сервиса.' : 'Quickly control chat, phone bookings and other contact options for each service.'}</p></div></div><div className="mt-5 grid gap-4 lg:grid-cols-2">{providers.map((provider) => <ProviderCommunicationRow key={`${provider.id}-${provider.chatEnabled}-${provider.communicationMode}-${provider.phoneBookingEnabled}-${provider.callbackEnabled}-${provider.requestPhotosEnabled}`} provider={provider} locale={locale} />)}</div></section>
}

function ProviderCommunicationRow({ provider, locale }: { provider: AutoCareApiProvider; locale: string }) {
    const ru = locale === 'ru'
    const [settings, setSettings] = useState(() => getSettings(provider))
    const [update, state] = useUpdateOwnerAutoCareCommunicationSettingsMutation()
    const toggle = async (key: SwitchKey, value: boolean) => {
        const next = { ...settings, [key]: value }
        if (key === 'chatEnabled' && value && next.responseWindowMinutes === null) next.responseWindowMinutes = 240
        setSettings(next)
        try { await update({ providerId: provider.id, ...next }).unwrap(); toast.success(ru ? 'Настройки сервиса сохранены.' : 'Service settings saved.') } catch (error) { setSettings(settings); toast.error(getApiErrorMessage(error, ru ? 'Не удалось сохранить настройки.' : 'Could not save settings.')) }
    }
    const phoneOnly = settings.communicationMode === 'phone_only'
    return <div className="rounded-[var(--radius-card)] border border-border p-4"><div className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-black text-foreground">{provider.name}</h3>{state.isLoading && <RotateCw className="size-4 animate-spin text-primary" aria-label={ru ? 'Сохраняем' : 'Saving'} />}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><CommunicationSwitch id={`profile-chat-${provider.id}`} checked={settings.chatEnabled} disabled={state.isLoading || phoneOnly} onChange={(event) => void toggle('chatEnabled', event.target.checked)} label={ru ? 'Чаты клиентов' : 'Customer chat'} description={phoneOnly ? (ru ? 'Недоступно в режиме только телефона' : 'Unavailable in phone-only mode') : undefined} /><CommunicationSwitch id={`profile-phone-${provider.id}`} checked={settings.phoneBookingEnabled} disabled={state.isLoading} onChange={(event) => void toggle('phoneBookingEnabled', event.target.checked)} label={ru ? 'Запись по телефону' : 'Phone bookings'} /><CommunicationSwitch id={`profile-callback-${provider.id}`} checked={settings.callbackEnabled} disabled={state.isLoading} onChange={(event) => void toggle('callbackEnabled', event.target.checked)} label={ru ? 'Перезвоним клиенту' : 'Callback requests'} /><CommunicationSwitch id={`profile-photos-${provider.id}`} checked={settings.requestPhotosEnabled} disabled={state.isLoading} onChange={(event) => void toggle('requestPhotosEnabled', event.target.checked)} label={ru ? 'Можно прислать фото' : 'Photo requests'} /></div><p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Phone className="size-3.5" />{phoneOnly ? (ru ? 'Связь по телефону' : 'Phone contact') : settings.chatEnabled ? (ru ? 'Чат доступен клиентам' : 'Chat is available') : (ru ? 'Чат выключен' : 'Chat is off')} {settings.requestPhotosEnabled && <Camera className="ml-2 size-3.5" />}</p></div>
}
