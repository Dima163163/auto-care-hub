import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import {
    type CabinetBlockedPeriod,
    useGetOwnerCabinetBlockedPeriodsQuery,
    useUpdateOwnerCabinetBlockedPeriodsMutation,
} from '@/entities/cabinet'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerCabinetBlockedPeriods({ cabinetId }: { cabinetId: string }) {
    const { t } = useTranslation()
    const { data, isLoading, isError } = useGetOwnerCabinetBlockedPeriodsQuery(cabinetId)
    const [update, { isLoading: isSaving }] = useUpdateOwnerCabinetBlockedPeriodsMutation()
    const [date, setDate] = useState('')
    const [kind, setKind] = useState<CabinetBlockedPeriod['kind']>('blocked')
    const [isAllDay, setIsAllDay] = useState(false)
    const [startTime, setStartTime] = useState('12:00')
    const [endTime, setEndTime] = useState('13:00')
    const [reason, setReason] = useState('')
    const [saveError, setSaveError] = useState(false)
    const [savingAction, setSavingAction] = useState<'add' | number | null>(null)
    const items = data?.items ?? []
    const allDay = kind === 'holiday' || isAllDay
    const canAdd = Boolean(date) && (allDay || startTime < endTime)

    const persist = async (next: CabinetBlockedPeriod[], action: 'add' | number) => {
        setSavingAction(action)
        setSaveError(false)
        try {
            await update({ id: cabinetId, items: next }).unwrap()
            return true
        } catch {
            setSaveError(true)
            return false
        } finally {
            setSavingAction(null)
        }
    }

    const addPeriod = async () => {
        if (!canAdd) return
        const candidate: CabinetBlockedPeriod = {
            date,
            kind,
            startTime: allDay ? null : startTime,
            endTime: allDay ? null : endTime,
            reason: reason.trim() || null,
        }
        const remaining = items.filter((item) => {
            if (item.date !== date) return true
            if (allDay || item.startTime === null || item.endTime === null) return false
            return item.startTime !== startTime || item.endTime !== endTime
        })
        const next = [...remaining, candidate].sort((left, right) =>
            `${left.date}-${left.startTime ?? ''}`.localeCompare(`${right.date}-${right.startTime ?? ''}`)
        )

        if (await persist(next, 'add')) {
            setDate('')
            setReason('')
        }
    }

    const removePeriod = (index: number) => {
        void persist(items.filter((_item, itemIndex) => itemIndex !== index), index)
    }

    return (
        <section className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold">{t('cabinet.schedule.blockedPeriodsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('cabinet.schedule.blockedPeriodsDescription')}</p>

            <div className="mt-4 grid gap-3 rounded-md border p-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_auto_110px_110px_1fr_auto] xl:items-center">
                <input
                    aria-label={t('cabinet.schedule.blockedDate')}
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="min-h-11 min-w-0 rounded-md border bg-background px-2 py-2 text-sm"
                />
                <select
                    aria-label={t('cabinet.schedule.blockedType')}
                    value={kind}
                    onChange={(event) => setKind(event.target.value as CabinetBlockedPeriod['kind'])}
                    className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm"
                >
                    <option value="blocked">{t('cabinet.schedule.unavailable')}</option>
                    <option value="holiday">{t('cabinet.schedule.holiday')}</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={allDay}
                        disabled={kind === 'holiday'}
                        onChange={(event) => setIsAllDay(event.target.checked)}
                    />
                    {t('cabinet.schedule.allDay')}
                </label>
                <input
                    aria-label={t('cabinet.schedule.blockedFrom')}
                    type="time"
                    value={startTime}
                    disabled={allDay}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50"
                />
                <input
                    aria-label={t('cabinet.schedule.blockedUntil')}
                    type="time"
                    value={endTime}
                    disabled={allDay}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50"
                />
                <input
                    aria-label={t('cabinet.schedule.blockedReason')}
                    value={reason}
                    maxLength={160}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t('cabinet.schedule.blockedReasonPlaceholder')}
                    className="min-h-11 min-w-0 rounded-md border bg-background px-2 py-2 text-sm"
                />
                <Button
                    type="button"
                    onClick={() => void addPeriod()}
                    disabled={!canAdd || (isSaving && savingAction !== 'add')}
                    loading={savingAction === 'add'}
                >
                    {t('cabinet.schedule.addBlockedPeriod')}
                </Button>
            </div>

            {(isError || saveError) && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {t('cabinet.schedule.blockedPeriodsError')}
                </p>
            )}
            {isLoading && <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>}
            {items.length > 0 && (
                <div className="mt-3 space-y-2">
                    {items.map((item, index) => (
                        <div key={item.id ?? `${item.date}-${item.startTime}-${index}`} className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {item.date} · {item.kind === 'holiday' ? t('cabinet.schedule.holiday') : t('cabinet.schedule.unavailable')}
                                </p>
                                <p className="truncate text-muted-foreground">
                                    {item.startTime && item.endTime ? `${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}` : t('cabinet.schedule.allDay')}
                                    {item.reason ? ` · ${item.reason}` : ''}
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => removePeriod(index)}
                                disabled={isSaving && savingAction !== index}
                                loading={savingAction === index}
                                variant="ghost"
                                size="icon"
                                title={t('cabinet.schedule.removeBlockedPeriod')}
                                aria-label={t('cabinet.schedule.removeBlockedPeriod')}
                                className="size-11 shrink-0 text-destructive hover:bg-destructive/10"
                            >
                                {savingAction !== index && <Trash2 className="size-4" aria-hidden="true" />}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
