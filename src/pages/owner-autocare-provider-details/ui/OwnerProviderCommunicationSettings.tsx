import { MessageCircle, Save } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { useUpdateOwnerAutoCareCommunicationSettingsMutation } from '@/entities/automotive-service'
import type { AutoCareApiProvider, UpdateAutoCareCommunicationSettingsInput } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { CommunicationSwitch } from '@/shared/ui/communication-switch'

type Props = { provider: AutoCareApiProvider }
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

export function OwnerProviderCommunicationSettings({ provider }: Props) {
    const { t } = useTranslation()
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
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageCircle className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{t('autocare.ownerProviderCommunicationTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderCommunicationDescription')}</p></div></div>
        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t('autocare.ownerProviderCommunicationTeamSize')}><select className={inputClass} value={settings.teamSize} onChange={(event) => set('teamSize', event.target.value as Settings['teamSize'])}><option value="solo">{t('autocare.ownerProviderCommunicationTeamOwner')}</option><option value="small_team">{t('autocare.ownerProviderCommunicationTeamSmall')}</option><option value="team">{t('autocare.ownerProviderCommunicationTeam')}</option><option value="enterprise">{t('autocare.ownerProviderCommunicationTeamEnterprise')}</option></select></Field>
            <Field label={t('autocare.ownerProviderCommunicationBusinessType')}><select className={inputClass} value={settings.businessType} onChange={(event) => set('businessType', event.target.value as Settings['businessType'])}><option value="sole_proprietor">{t('autocare.ownerProviderCommunicationSoleProprietor')}</option><option value="self_employed">{t('autocare.ownerProviderCommunicationSelfEmployed')}</option><option value="company">{t('autocare.ownerProviderCommunicationCompany')}</option><option value="private_master">{t('autocare.ownerProviderCommunicationPrivateMaster')}</option><option value="other">{t('autocare.ownerProviderCommunicationOther')}</option></select></Field>
            <Field label={t('autocare.ownerProviderCommunicationBookingMode')}><select className={inputClass} value={settings.communicationMode} onChange={(event) => { const mode = event.target.value as Settings['communicationMode']; set('communicationMode', mode); if (mode === 'phone_only') set('chatEnabled', false) }}><option value="online">{t('autocare.ownerProviderCommunicationBookingOnline')}</option><option value="request_then_confirm">{t('autocare.ownerProviderCommunicationBookingRequestConfirm')}</option><option value="phone_only">{t('autocare.ownerProviderCommunicationBookingPhone')}</option></select></Field>
            <Field label={t('autocare.ownerProviderCommunicationResponseTime')}><select className={inputClass} value={settings.responseWindowMinutes ?? ''} onChange={(event) => set('responseWindowMinutes', event.target.value ? Number(event.target.value) : null)} disabled={!settings.chatEnabled}><option value="60">{t('autocare.ownerProviderCommunicationResponseHour')}</option><option value="120">{t('autocare.ownerProviderCommunicationResponseTwoHours')}</option><option value="240">{t('autocare.ownerProviderCommunicationResponseFourHours')}</option><option value="1440">{t('autocare.ownerProviderCommunicationResponseDay')}</option></select></Field>
            <div className="grid gap-2 sm:col-span-2"><CommunicationSwitch id="owner-chat-enabled" testId="owner-chat-toggle" compact checked={settings.chatEnabled} disabled={settings.communicationMode === 'phone_only'} onChange={(event) => set('chatEnabled', event.target.checked)} label={t('autocare.ownerProviderCommunicationCustomerChat')} description={settings.communicationMode === 'phone_only' ? t('autocare.ownerProviderCommunicationPhoneOnlyChat') : settings.chatEnabled ? t('autocare.ownerProviderCommunicationChatEnabled') : t('autocare.ownerProviderCommunicationChatDisabled')} /><div className="grid gap-2 sm:grid-cols-3"><CommunicationSwitch id="owner-phone-booking" compact checked={settings.phoneBookingEnabled} onChange={(event) => set('phoneBookingEnabled', event.target.checked)} label={t('autocare.ownerProviderCommunicationPhoneBookings')} /><CommunicationSwitch id="owner-callback" compact checked={settings.callbackEnabled} onChange={(event) => set('callbackEnabled', event.target.checked)} label={t('autocare.ownerProviderCommunicationCallback')} /><CommunicationSwitch id="owner-photos" compact checked={settings.requestPhotosEnabled} onChange={(event) => set('requestPhotosEnabled', event.target.checked)} label={t('autocare.ownerProviderCommunicationPhotos')} /></div></div>
            <Field className="sm:col-span-2" label={t('autocare.ownerProviderCommunicationPublicNote')}><textarea rows={2} className="w-full rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={settings.publicContactNote ?? ''} onChange={(event) => set('publicContactNote', event.target.value || null)} placeholder={t('autocare.ownerProviderCommunicationPublicNotePlaceholder')} /></Field>
            <button type="submit" disabled={state.isLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50 sm:col-span-2"><Save className="size-4" />{state.isLoading ? t('autocare.ownerProviderCommunicationSaving') : t('autocare.ownerProviderCommunicationSave')}</button>
            {state.isSuccess && <p role="status" className="text-xs font-bold text-status-success-foreground sm:col-span-2">{t('autocare.ownerProviderCommunicationSaved')}</p>}
            {state.error && <p role="alert" className="text-xs font-bold text-destructive sm:col-span-2">{getApiErrorMessage(state.error, t('autocare.ownerProviderCommunicationSaveError'))}</p>}
        </form>
    </section>
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) { return <label className={`grid gap-1.5 text-xs font-black text-foreground ${className}`}><span>{label}</span>{children}</label> }
