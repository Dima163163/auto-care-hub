import { Camera, CheckCircle2, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function ProviderRequestPanel({ provider }: { provider: ProviderProfile }) {
    const { t, locale } = useTranslation()
    const [isSent, setIsSent] = useState(false)

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSent(true)
    }

    return (
        <aside id="request" data-provider-id={provider.id} className="h-fit rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm lg:sticky lg:top-5">
            <h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerRequestTitle')}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.providerRequestDescription')}</p>
            {isSent ? <SuccessState /> : <RequestForm locale={locale} onSubmit={handleSubmit} />}
        </aside>
    )
}

function SuccessState() {
    const { t } = useTranslation()

    return <div className="mt-6 rounded-[var(--radius-card)] bg-status-success-surface p-4 text-sm font-semibold text-status-success-foreground"><CheckCircle2 className="mb-2 size-6" />{t('autocare.providerRequestSent')}<p className="mt-3 text-xs font-medium">{t('autocare.providerDirectPayment')}</p></div>
}

function RequestForm({ locale, onSubmit }: { locale: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
    const { t } = useTranslation()

    return <form className="mt-6 grid gap-4" onSubmit={onSubmit}><label className="grid gap-2 text-xs font-bold text-foreground">{t('autocare.providerChooseService')}<select className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40">{automotiveServices.map((service) => <option key={service.id} value={service.id}>{getServiceLabel(service, locale)}</option>)}</select></label><label className="grid gap-2 text-xs font-bold text-foreground">{t('autocare.providerChooseTime')}<input className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.providerTimePlaceholder')} /></label><label className="grid gap-2 text-xs font-bold text-foreground"><span>{t('autocare.providerMessagePlaceholder')}</span><textarea required rows={4} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.providerMessagePlaceholder')} /></label><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{t('autocare.providerAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"><Send className="size-4" />{t('autocare.providerSendRequest')}</button><p className="text-xs font-medium leading-5 text-muted-foreground">{t('autocare.providerWarranty')}</p></form>
}
