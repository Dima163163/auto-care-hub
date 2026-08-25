import { useState } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useCreateAutoCareExpertQuestionMutation } from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { useTranslation } from '@/shared/lib/useTranslation'

export function ExpertQuestionCard({ categorySlug }: { categorySlug: string }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: user } = useGetMeQuery()
    const [symptoms, setSymptoms] = useState('')
    const [createQuestion, state] = useCreateAutoCareExpertQuestionMutation()
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!symptoms.trim()) return
        if (!user) {
            navigate('/login', { state: { from: location } })
            return
        }
        if (!user.emailVerifiedAt) {
            navigate('/verify-email', { state: { from: location } })
            return
        }
        try {
            await createQuestion({ symptoms: symptoms.trim(), categorySlug }).unwrap()
            setSymptoms('')
        } catch {
            // RTK Query state renders the recoverable error below.
        }
    }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><HelpCircle className="size-4" /></span><div><h2 className="text-sm font-black text-foreground">{t('autocare.expertQuestionTitle')}</h2><p className="mt-1 text-xs text-muted-foreground">{t('autocare.expertQuestionText')}</p></div></div>{state.isSuccess ? <p className="mt-4 rounded-[var(--radius-control)] bg-status-success-surface px-3 py-2 text-xs font-bold text-status-success-foreground">{t('autocare.expertQuestionSent')}</p> : <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void submit(event)}><input value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder={t('autocare.expertQuestionPlaceholder')} className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={state.isLoading || !symptoms.trim()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><Send className="size-3.5" />{t('autocare.expertQuestionSend')}</button></form>}{state.isError && <p role="alert" className="mt-2 text-xs font-bold text-destructive">{t('autocare.expertQuestionError')}</p>}</section>
}
