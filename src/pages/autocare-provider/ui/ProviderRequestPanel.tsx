import { CalendarDays, Camera, CheckCircle2, Clock3, Send, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import type { ProviderOffering, ProviderProfile } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type ProviderRequestPanelProps = {
    provider: ProviderProfile
    offering: ProviderOffering
}

const bookingTimes = ['10:00', '12:00', '14:30', '16:00', '18:30']

export function ProviderRequestPanel({ provider, offering }: ProviderRequestPanelProps) {
    const { t } = useTranslation()
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [isSent, setIsSent] = useState(false)

    return (
        <aside className="grid h-fit gap-5 lg:sticky lg:top-5">
            <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('autocare.bookAction')}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{t('autocare.requestSelectedService')}</h2>
                <div className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4"><p className="font-black text-secondary-foreground">{offering.priceLabel}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{offering.duration} · {offering.availability}</p></div>
                <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('autocare.providerChooseTime')}</p><div className="mt-3 grid grid-cols-2 gap-2">{bookingTimes.map((time, index) => <button type="button" key={time} className={index === 2 ? 'h-10 rounded-[var(--radius-control)] border border-primary bg-primary/10 text-sm font-black text-primary' : 'h-10 rounded-[var(--radius-control)] border border-border text-sm font-bold text-foreground transition hover:border-primary hover:text-primary'}>{time}</button>)}</div></div>
                <Link to={routePaths.serviceRequest(provider.id, offering.serviceId)} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><CalendarDays className="size-4" />{t('autocare.bookAction')}</Link>
                <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs font-semibold leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-status-success-foreground" />{t('autocare.providerDirectPayment')}</div>
            </section>
            <section id="request" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
                <button type="button" onClick={() => setIsRequestOpen((value) => !value)} className="flex w-full items-start justify-between gap-3 text-left"><div><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerRequestTitle')}</h2><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.providerRequestDescription')}</p></div><Clock3 className="mt-1 size-5 shrink-0 text-primary" /></button>
                {isRequestOpen && (isSent ? <SuccessState /> : <EstimateRequestForm onSubmit={() => setIsSent(true)} />)}
            </section>
        </aside>
    )
}

function SuccessState() {
    const { t } = useTranslation()
    return <div className="mt-5 rounded-[var(--radius-card)] bg-status-success-surface p-4 text-sm font-semibold text-status-success-foreground"><CheckCircle2 className="mb-2 size-6" />{t('autocare.providerRequestSent')}</div>
}

function EstimateRequestForm({ onSubmit }: { onSubmit: () => void }) {
    const { t } = useTranslation()
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit() }

    return <form className="mt-5 grid gap-3" onSubmit={handleSubmit}><textarea required rows={3} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.providerMessagePlaceholder')} /><label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{t('autocare.providerAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"><Send className="size-4" />{t('autocare.providerSendRequest')}</button></form>
}
