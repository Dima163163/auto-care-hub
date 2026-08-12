import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    type CabinetScheduleException,
    useGetOwnerCabinetScheduleExceptionsQuery,
    useUpdateOwnerCabinetScheduleExceptionsMutation,
} from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerCabinetScheduleExceptions({ cabinetId }: { cabinetId: string }) {
    const { t } = useTranslation()
    const { data } = useGetOwnerCabinetScheduleExceptionsQuery(cabinetId)
    const [update, { isLoading }] = useUpdateOwnerCabinetScheduleExceptionsMutation()
    const [date, setDate] = useState('')
    const [isClosed, setIsClosed] = useState(true)
    const [openTime, setOpenTime] = useState('10:00')
    const [closeTime, setCloseTime] = useState('18:00')
    const items = data?.items ?? []

    const addException = async () => {
        if (!date) return
        const next: CabinetScheduleException[] = [
            ...items.filter((item) => item.date !== date),
            { date, isClosed, openTime: isClosed ? null : openTime, closeTime: isClosed ? null : closeTime },
        ].sort((a, b) => a.date.localeCompare(b.date))
        await update({ id: cabinetId, items: next }).unwrap()
        setDate('')
    }

    const removeException = async (targetDate: string) => {
        await update({ id: cabinetId, items: items.filter((item) => item.date !== targetDate) }).unwrap()
    }

    return (
        <section className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold">{t('cabinet.schedule.exceptionsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('cabinet.schedule.exceptionsDescription')}</p>
            <div className="mt-4 grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto_120px_120px_auto] sm:items-center">
                <input aria-label={t('cabinet.schedule.exceptionDate')} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isClosed} onChange={(event) => setIsClosed(event.target.checked)} />{t('cabinet.schedule.closed')}</label>
                <input aria-label={t('cabinet.schedule.open')} type="time" value={openTime} disabled={isClosed} onChange={(event) => setOpenTime(event.target.value)} className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50" />
                <input aria-label={t('cabinet.schedule.close')} type="time" value={closeTime} disabled={isClosed} onChange={(event) => setCloseTime(event.target.value)} className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50" />
                <Button type="button" onClick={() => void addException()} disabled={!date} loading={isLoading} className="min-h-11">{t('cabinet.schedule.addException')}</Button>
            </div>
            {items.length > 0 && <div className="mt-3 space-y-2">{items.map((item) => <div key={item.date} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span>{item.date} · {item.isClosed ? t('cabinet.schedule.closed') : `${item.openTime}–${item.closeTime}`}</span><Button type="button" variant="ghost" size="sm" onClick={() => void removeException(item.date)} loading={isLoading} className="text-destructive">{t('cabinet.schedule.removeException')}</Button></div>)}</div>}
        </section>
    )
}
