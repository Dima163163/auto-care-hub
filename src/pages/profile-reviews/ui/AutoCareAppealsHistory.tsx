import { Gavel } from 'lucide-react'
import { useState } from 'react'

import {
    type AutoCareAppeal,
    useGetMyAutoCareAppealsQuery,
    useWithdrawAutoCareAppealMutation,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'
import { Button } from '@/components/ui/button'

const copy = {
    ru: { title: 'Мои обращения и апелляции', description: 'Здесь сохраняются обращения по профилям сервисов, отзывам и решениям модерации.', empty: 'Обращений пока нет.', withdraw: 'Отозвать обращение', withdrawing: 'Отзываем…', failedWithdraw: 'Не удалось отозвать обращение.', subject: { provider: 'Профиль сервиса', review: 'Отзыв', suspension: 'Блокировка', catalog: 'Каталог' }, status: { pending: 'На проверке', accepted: 'Принято', rejected: 'Отклонено', withdrawn: 'Отозвано' } },
    en: { title: 'My appeals', description: 'Appeals about service profiles, reviews and moderation decisions stay here.', empty: 'No appeals yet.', withdraw: 'Withdraw appeal', withdrawing: 'Withdrawing…', failedWithdraw: 'Could not withdraw the appeal.', subject: { provider: 'Provider profile', review: 'Review', suspension: 'Suspension', catalog: 'Catalog' }, status: { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn' } },
}

type AppealCopy = (typeof copy)[keyof typeof copy]

export function AutoCareAppealsHistory() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetMyAutoCareAppealsQuery()
    const [withdraw, withdrawState] = useWithdrawAutoCareAppealMutation()
    const [withdrawError, setWithdrawError] = useState<string | null>(null)
    if (query.isLoading) return <StateCard variant="loading" description={t('common.loading')} />
    if (query.error) return <StateCard variant="error" title={t('common.failedToLoad')} description={getApiErrorMessage(query.error, t('common.tryAgainLater'))} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />
    const appeals = query.data ?? []
    const handleWithdraw = async (appealId: string) => {
        setWithdrawError(null)
        try {
            await withdraw(appealId).unwrap()
        } catch (error) {
            setWithdrawError(getApiErrorMessage(error, text.failedWithdraw))
        }
    }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm md:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Gavel className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>{withdrawError && <p role="alert" className="mt-4 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold text-destructive">{withdrawError}</p>}{appeals.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{appeals.map((appeal) => <AppealCard key={appeal.id} appeal={appeal} locale={locale} text={text} onWithdraw={handleWithdraw} isWithdrawing={withdrawState.isLoading} />)}</div>}</section>
}

function AppealCard({ appeal, locale, text, onWithdraw, isWithdrawing }: { appeal: AutoCareAppeal; locale: string; text: AppealCopy; onWithdraw: (appealId: string) => Promise<void>; isWithdrawing: boolean }) {
    const date = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' }).format(new Date(appeal.createdAt))
    return <article className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-primary">{text.subject[appeal.subject]}</p><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-bold text-muted-foreground">{text.status[appeal.status]}</span></div><p className="mt-2 text-xs text-muted-foreground">{date}</p><p className="mt-3 text-sm leading-6 text-foreground">{appeal.reason}</p>{appeal.decisionReason && <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{appeal.decisionReason}</p>}{appeal.status === 'pending' && <Button type="button" size="sm" variant="outline" className="mt-4" disabled={isWithdrawing} loading={isWithdrawing} onClick={() => void onWithdraw(appeal.id)}>{isWithdrawing ? text.withdrawing : text.withdraw}</Button>}</article>
}
