import { MessageCircle, Save } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { useUpdateOwnerAutoCareCommunicationSettingsMutation, type AutoCareApiProvider, type UpdateAutoCareCommunicationSettingsInput } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { CommunicationSwitch } from '@/shared/ui/communication-switch'

type Props = { provider: AutoCareApiProvider; locale: string }
type Settings = Omit<UpdateAutoCareCommunicationSettingsInput, 'providerId'>

function getInitialSettings(provider: AutoCareApiProvider): Settings {
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

export function OwnerProviderCommunicationSettings({ provider, locale }: Props) {
    const ru = locale === 'ru'
    const [settings, setSettings] = useState(() => getInitialSettings(provider))
    const [update, state] = useUpdateOwnerAutoCareCommunicationSettingsMutation()
    const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }))
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        try {
            await update({ providerId: provider.id, ...settings }).unwrap()
        } catch {
            return
        }
    }
    const inputClass = 'h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
    return <section data-testid="owner-communication-settings" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageCircle className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{ru ? 'Связь и запись' : 'Contact and booking'}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{ru ? 'Выберите удобный режим для вашей команды. Маленький сервис может принимать заявки по телефону и не обещать мгновенный ответ в чате.' : 'Choose the workflow your team can reliably support. A small service can accept phone requests without promising instant chat replies.'}</p></div></div>
        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={ru ? 'Размер команды' : 'Team size'}><select className={inputClass} value={settings.teamSize} onChange={(event) => set('teamSize', event.target.value as Settings['teamSize'])}><option value="solo">{ru ? 'Сам владелец' : 'Owner only'}</option><option value="small_team">{ru ? 'Маленькая команда' : 'Small team'}</option><option value="team">{ru ? 'Команда' : 'Team'}</option><option value="enterprise">{ru ? 'Сеть / крупный сервис' : 'Enterprise'}</option></select></Field>
            <Field label={ru ? 'Форма работы' : 'Business type'}><select className={inputClass} value={settings.businessType} onChange={(event) => set('businessType', event.target.value as Settings['businessType'])}><option value="sole_proprietor">{ru ? 'ИП' : 'Sole proprietor'}</option><option value="self_employed">{ru ? 'Самозанятый' : 'Self-employed'}</option><option value="company">{ru ? 'Компания' : 'Company'}</option><option value="private_master">{ru ? 'Частный мастер' : 'Independent mechanic'}</option><option value="other">{ru ? 'Другое' : 'Other'}</option></select></Field>
            <Field label={ru ? 'Режим записи' : 'Booking mode'}><select className={inputClass} value={settings.communicationMode} onChange={(event) => { const mode = event.target.value as Settings['communicationMode']; set('communicationMode', mode); if (mode === 'phone_only') set('chatEnabled', false) }}><option value="online">{ru ? 'Онлайн-запись по слотам' : 'Online slots'}</option><option value="request_then_confirm">{ru ? 'Заявка, затем подтверждение по телефону' : 'Request, then phone confirmation'}</option><option value="phone_only">{ru ? 'Только по телефону' : 'Phone only'}</option></select></Field>
            <Field label={ru ? 'Обычно отвечаем' : 'Typical response time'}><select className={inputClass} value={settings.responseWindowMinutes ?? ''} onChange={(event) => set('responseWindowMinutes', event.target.value ? Number(event.target.value) : null)} disabled={!settings.chatEnabled}><option value="60">{ru ? 'В течение часа' : 'Within an hour'}</option><option value="120">{ru ? 'В течение 2 часов' : 'Within 2 hours'}</option><option value="240">{ru ? 'В течение 4 часов' : 'Within 4 hours'}</option><option value="1440">{ru ? 'В течение дня' : 'Within a day'}</option></select></Field>
            <div className="grid gap-2 sm:col-span-2"><CommunicationSwitch id="owner-chat-enabled" testId="owner-chat-toggle" compact checked={settings.chatEnabled} disabled={settings.communicationMode === 'phone_only'} onChange={(event) => set('chatEnabled', event.target.checked)} label={ru ? 'Чаты клиентов' : 'Customer chat'} description={settings.communicationMode === 'phone_only' ? (ru ? 'В режиме «Только по телефону» чат отключён.' : 'Chat is disabled in phone-only mode.') : settings.chatEnabled ? (ru ? 'Клиенты могут задать вопрос и отправить фотографии.' : 'Customers can ask questions and send photos.') : (ru ? 'Чаты скрыты на публичной странице. Оставьте телефон и включите запись по телефону.' : 'Chat is hidden publicly. Keep phone bookings enabled.')} /><div className="grid gap-2 sm:grid-cols-3"><CommunicationSwitch id="owner-phone-booking" compact checked={settings.phoneBookingEnabled} onChange={(event) => set('phoneBookingEnabled', event.target.checked)} label={ru ? 'Запись по телефону' : 'Phone bookings'} /><CommunicationSwitch id="owner-callback" compact checked={settings.callbackEnabled} onChange={(event) => set('callbackEnabled', event.target.checked)} label={ru ? 'Перезвоним клиенту' : 'Callback requests'} /><CommunicationSwitch id="owner-photos" compact checked={settings.requestPhotosEnabled} onChange={(event) => set('requestPhotosEnabled', event.target.checked)} label={ru ? 'Можно прислать фото' : 'Allow photo requests'} /></div></div>
            <Field className="sm:col-span-2" label={ru ? 'Сообщение для клиентов' : 'Public contact note'}><textarea rows={2} className="w-full rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={settings.publicContactNote ?? ''} onChange={(event) => set('publicContactNote', event.target.value || null)} placeholder={ru ? 'Например: маленькая команда, отвечаем по телефону до 20:00' : 'For example: small team, phone replies until 20:00'} /></Field>
            <button type="submit" disabled={state.isLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"><Save className="size-4" />{state.isLoading ? (ru ? 'Сохраняем…' : 'Saving…') : (ru ? 'Сохранить режим связи' : 'Save contact settings')}</button>
            {state.isSuccess && <p role="status" className="text-xs font-bold text-status-success-foreground sm:col-span-2">{ru ? 'Настройки сохранены и опубликованы для новых клиентов.' : 'Settings saved for new customer requests.'}</p>}
            {state.error && <p role="alert" className="text-xs font-bold text-destructive sm:col-span-2">{getApiErrorMessage(state.error, ru ? 'Не удалось сохранить настройки.' : 'Could not save settings.')}</p>}
        </form>
    </section>
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) { return <label className={`grid gap-1.5 text-xs font-black text-foreground ${className}`}><span>{label}</span>{children}</label> }
