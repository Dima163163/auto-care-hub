import { Check, Edit3, Gift, Star } from 'lucide-react'
import { useState } from 'react'

import {
    useGetMyAutoCareReviewsQuery,
    useRedeemAutoCareReviewPromoMutation,
    useUpdateAutoCareReviewMutation,
    type AutoCareApiReview,
} from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

export function AutoCareReviewResolutionPanel() {
    const { locale } = useTranslation()
    const reviews = useGetMyAutoCareReviewsQuery()
    const [redeemPromo, redeemState] = useRedeemAutoCareReviewPromoMutation()
    const [updateReview, updateState] = useUpdateAutoCareReviewMutation()
    const [code, setCode] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [selectedReview, setSelectedReview] = useState<AutoCareApiReview | null>(null)
    const [rating, setRating] = useState('5')
    const [text, setText] = useState('')
    const ru = locale === 'ru'
    const copy = ru
        ? { title: 'Решение от автосервиса', description: 'Введите промокод от сервиса после повторного визита. Он откроет одноразовое редактирование отзыва.', code: 'Промокод', redeem: 'Погасить код', redeemed: 'Код принят. Теперь отзыв можно обновить один раз.', edit: 'Обновить отзыв', editTitle: 'Обновить отзыв после решения', editDescription: 'Расскажите, как сервис урегулировал ситуацию.', rating: 'Оценка', text: 'Текст отзыва', save: 'Сохранить', cancel: 'Отмена', empty: 'Связанных отзывов пока нет.' }
        : { title: 'Service resolution', description: 'Enter a service promo code after a repeat visit. It unlocks one one-time review edit.', code: 'Promo code', redeem: 'Redeem code', redeemed: 'Code accepted. You can now update the review once.', edit: 'Update review', editTitle: 'Update review after resolution', editDescription: 'Tell other drivers how the service resolved the issue.', rating: 'Rating', text: 'Review text', save: 'Save', cancel: 'Cancel', empty: 'No linked reviews yet.' }

    const submitCode = async () => {
        setMessage(null)
        try {
            await redeemPromo({ code: code.trim().toUpperCase() }).unwrap()
            setCode('')
            setMessage(copy.redeemed)
        } catch {
            setMessage(ru ? 'Промокод не найден или уже использован.' : 'Promo code was not found or was already used.')
        }
    }
    const openEditor = (review: AutoCareApiReview) => { setSelectedReview(review); setRating(String(review.rating)); setText(review.text) }
    const saveReview = async () => {
        if (!selectedReview) return
        await updateReview({ reviewId: selectedReview.id, rating: Number(rating), text }).unwrap()
        setSelectedReview(null)
    }

    if (reviews.isLoading || reviews.isError || (reviews.data?.length ?? 0) === 0) return null
    return <><section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm md:p-6"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Gift className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{copy.title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p></div></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="autocare-review-promo">{copy.code}</label><input id="autocare-review-promo" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="CARE-XXXXXXXX" className="h-11 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 font-bold tracking-wider" /><button type="button" disabled={redeemState.isLoading || code.length < 13} onClick={() => void submitCode()} className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60"><Check className="size-4" />{copy.redeem}</button></div>{message && <p className="mt-3 text-sm font-bold text-status-success-foreground">{message}</p>}<div className="mt-5 grid gap-3 md:grid-cols-2">{reviews.data?.map((review) => <article key={review.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-foreground">{review.authorName}</p><p className="text-xs text-muted-foreground">{review.vehicleLabel}</p></div><span className="inline-flex items-center gap-1 font-black text-status-warning-foreground"><Star className="size-4 fill-current" />{review.rating.toFixed(1)}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{review.text}</p>{review.canEdit && <button type="button" onClick={() => openEditor(review)} className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/30 px-3 py-2 text-xs font-black text-primary hover:bg-primary/10"><Edit3 className="size-3.5" />{copy.edit}</button>}</article>)}</div></section><Dialog isOpen={Boolean(selectedReview)} onOpenChange={(open) => { if (!open) setSelectedReview(null) }} className="max-w-lg"><DialogContent><DialogHeader><DialogTitle>{copy.editTitle}</DialogTitle><DialogDescription>{copy.editDescription}</DialogDescription></DialogHeader><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.rating}</span><select value={rating} onChange={(event) => setRating(event.target.value)} className="select-with-icon h-11 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-9"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select></label><label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.text}</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm leading-6" /></label></div><DialogFooter><button type="button" onClick={() => setSelectedReview(null)} className="h-10 rounded-[var(--radius-control)] border border-border px-4 text-sm font-black">{copy.cancel}</button><button type="button" disabled={updateState.isLoading || text.trim().length < 10} onClick={() => void saveReview()} className="h-10 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60">{copy.save}</button></DialogFooter></DialogContent></Dialog></>
}
