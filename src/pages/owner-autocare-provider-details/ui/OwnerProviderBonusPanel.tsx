import { Coins, WalletCards } from 'lucide-react'

import { useGetOwnerAutoCareBonusLiabilityQuery, type AutoCareApiProvider } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider; locale: string }

export function OwnerProviderBonusPanel({ provider, locale }: Props) {
    const ru = locale === 'ru'
    const query = useGetOwnerAutoCareBonusLiabilityQuery(provider.id)
    if (query.isLoading) return <StateCard variant="loading" title={ru ? 'Загружаем историю бонусов…' : 'Loading bonus history…'} />
    if (query.error) return <StateCard variant="error" title={ru ? 'Не удалось загрузить историю бонусов' : 'Could not load bonus history'} description={getApiErrorMessage(query.error, '')} action={<RetryButton onRetry={query.refetch} label={ru ? 'Повторить' : 'Retry'} />} />
    const data = query.data
    if (!data) return null
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><WalletCards className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{ru ? 'Бонусы и обязательства' : 'Bonuses and liability'}</h2><p className="mt-1 text-sm text-muted-foreground">{ru ? 'Остатки и движения по бонусам клиентов вашего сервиса.' : 'Customer bonus balances and movements for this service.'}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={ru ? 'Активных балансов' : 'Active balances'} value={String(data.activeAccounts)} /><Metric label={ru ? 'Обязательства, баллов' : 'Liability, points'} value={String(data.liabilityPoints)} /></div><div className="mt-5 space-y-2">{data.entries.length === 0 ? <p className="rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{ru ? 'Операций с бонусами пока нет.' : 'There are no bonus transactions yet.'}</p> : data.entries.slice(0, 12).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{entry.clientName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{entry.reason}</p></div><div className="shrink-0 text-right"><p className={`text-sm font-black ${entry.points > 0 ? 'text-status-success-foreground' : 'text-destructive'}`}>{entry.points > 0 ? '+' : ''}{entry.points}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { dateStyle: 'short' }).format(new Date(entry.createdAt))}</p></div></div>)}</div></section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-card)] bg-secondary p-4"><Coins className="size-4 text-primary" /><p className="mt-2 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div> }
