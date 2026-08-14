import { useState } from 'react'
import { MessageSquareText, Send } from 'lucide-react'

import { useCreateAutoCareBroadcastRequestMutation } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function MultiProviderRequestCard({ serviceDefinitionId, marketId }: { serviceDefinitionId: string; marketId?: string }) {
    const { locale } = useTranslation()
    const [open, setOpen] = useState(false)
    const [description, setDescription] = useState('')
    const [createRequest, state] = useCreateAutoCareBroadcastRequestMutation()
    const copy = locale === 'ru'
        ? { title: 'Нужна точная оценка?', text: 'Отправьте один вопрос нескольким подходящим сервисам и сравните ответы.', open: 'Запросить предложения', close: 'Скрыть форму', placeholder: 'Опишите проблему, симптомы и желаемый результат…', submit: 'Отправить сервисам', success: 'Запрос отправлен — предложения появятся в кабинете.' }
        : { title: 'Need a precise estimate?', text: 'Send one issue to several eligible providers and compare their replies.', open: 'Request offers', close: 'Hide form', placeholder: 'Describe the issue, symptoms and desired result…', submit: 'Send to providers', success: 'Request sent — offers will appear in your account.' }
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (description.trim().length < 10) return
        await createRequest({ serviceDefinitionId, marketId, issueDescription: description.trim() }).unwrap()
        setDescription('')
    }
    return <section className="rounded-[var(--radius-panel)] border border-primary/25 bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageSquareText className="size-4" /></span><div><h2 className="text-sm font-black text-foreground">{copy.title}</h2><p className="mt-1 text-xs font-medium text-muted-foreground">{copy.text}</p></div></div><button type="button" onClick={() => setOpen((value) => !value)} className="h-9 rounded-[var(--radius-control)] border border-primary px-3 text-xs font-black text-primary">{open ? copy.close : copy.open}</button></div>{open && <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}><textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={4000} required placeholder={copy.placeholder} className="min-h-24 rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Фото и автомобиль можно добавить в кабинете после отправки.</span><button type="submit" disabled={state.isLoading} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground"><Send className="size-3.5" />{state.isLoading ? '…' : copy.submit}</button></div>{state.isSuccess && <p className="text-xs font-bold text-status-success-foreground">{copy.success}</p>}{state.isError && <p className="text-xs font-bold text-destructive">Не удалось отправить запрос. Проверьте вход в аккаунт.</p>}</form>}</section>
}
