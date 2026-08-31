import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { useCreateAutoCareGuaranteeClaimMutation } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

export function GuaranteeClaimCard({ requestId }: { requestId: string }) {
    const { locale } = useTranslation()
    const [summary, setSummary] = useState('')
    const [createClaim, state] = useCreateAutoCareGuaranteeClaimMutation()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const copy = locale === 'ru'
        ? { title: 'Гарантия AutoCare', text: 'Если работа не соответствует согласованной смете, опишите ситуацию — сервис и команда поддержки увидят обращение.', placeholder: 'Что нужно исправить?', send: 'Создать обращение', sent: 'Обращение принято. Мы передали его на проверку.' }
        : { title: 'AutoCare guarantee', text: 'If the result differs from the agreed estimate, tell us what happened so the provider and support team can review it.', placeholder: 'What needs to be fixed?', send: 'Open a claim', sent: 'Claim received. It has been sent for review.' }
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!summary.trim()) return
        setSubmitError(null)
        try {
            await createClaim({ requestId, claimType: 'quality', summary: summary.trim() }).unwrap()
            setSummary('')
        } catch (error) {
            setSubmitError(getApiErrorMessage(error, locale === 'ru' ? 'Не удалось создать обращение. Попробуйте ещё раз.' : 'Could not open the claim. Please try again.'))
        }
    }
    return <section className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="text-sm font-black text-foreground">{copy.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.text}</p></div></div>{state.isSuccess ? <p className="mt-3 text-xs font-bold text-status-success-foreground">{copy.sent}</p> : <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void submit(event)}><input value={summary} onChange={(event) => { setSummary(event.target.value); setSubmitError(null) }} placeholder={copy.placeholder} aria-invalid={Boolean(submitError) || undefined} aria-describedby={submitError ? 'autocare-guarantee-error' : undefined} className="h-9 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={state.isLoading || !summary.trim()} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50">{copy.send}</button></form>}{submitError ? <p id="autocare-guarantee-error" role="alert" className="mt-2 text-xs font-semibold text-destructive">{submitError}</p> : null}</section>
}
