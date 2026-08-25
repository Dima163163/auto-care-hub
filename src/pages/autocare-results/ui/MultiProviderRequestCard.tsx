import { useState } from 'react'
import { MessageSquareText, Send } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useCreateAutoCareBroadcastRequestMutation } from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { useTranslation } from '@/shared/lib/useTranslation'

export function MultiProviderRequestCard({ serviceDefinitionId, marketId }: { serviceDefinitionId: string; marketId?: string }) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: user } = useGetMeQuery()
    const [open, setOpen] = useState(false)
    const [description, setDescription] = useState('')
    const [createRequest, state] = useCreateAutoCareBroadcastRequestMutation()
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (description.trim().length < 10) return
        if (!user) {
            navigate('/login', { state: { from: location } })
            return
        }
        if (!user.emailVerifiedAt) {
            navigate('/verify-email', { state: { from: location } })
            return
        }
        try {
            await createRequest({ serviceDefinitionId, marketId, issueDescription: description.trim() }).unwrap()
            setDescription('')
        } catch {
            // RTK Query state renders the recoverable error below.
        }
    }
    return <section className="rounded-[var(--radius-panel)] border border-primary/25 bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageSquareText className="size-4" /></span><div><h2 className="text-sm font-black text-foreground">{t('autocare.multiProviderTitle')}</h2><p className="mt-1 text-xs font-medium text-muted-foreground">{t('autocare.multiProviderText')}</p></div></div><button type="button" onClick={() => setOpen((value) => !value)} className="h-9 rounded-[var(--radius-control)] border border-primary px-3 text-xs font-black text-primary">{open ? t('autocare.multiProviderClose') : t('autocare.multiProviderOpen')}</button></div>{open && <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={4000} required placeholder={t('autocare.multiProviderPlaceholder')} className="min-h-24 rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{t('autocare.multiProviderPhotoHint')}</span><button type="submit" disabled={state.isLoading} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><Send className="size-3.5" />{state.isLoading ? '…' : t('autocare.multiProviderSubmit')}</button></div>{state.isSuccess && <p className="text-xs font-bold text-status-success-foreground">{t('autocare.multiProviderSuccess')}</p>}{state.isError && <p className="text-xs font-bold text-destructive">{t('autocare.multiProviderError')}</p>}</form>}</section>
}
