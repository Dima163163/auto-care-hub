import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    type CabinetScheduleItem,
    useGetOwnerCabinetScheduleQuery,
    useUpdateOwnerCabinetScheduleMutation,
} from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

const fallbackSchedule: CabinetScheduleItem[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    openTime: '08:00',
    closeTime: '22:00',
    isOpen: weekday > 0 && weekday < 6,
}))

export function OwnerCabinetScheduleFields({ cabinetId }: { cabinetId: string }) {
    const { t } = useTranslation()
    const { data, isLoading } = useGetOwnerCabinetScheduleQuery(cabinetId)
    const [updateSchedule, { isLoading: isSaving }] = useUpdateOwnerCabinetScheduleMutation()
    const [items, setItems] = useState(fallbackSchedule)
    const [hasEdited, setHasEdited] = useState(false)
    const dayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(Date.UTC(2024, 0, 1 + index)))), [])

    const visibleItems = !hasEdited && data?.items.length === 7 ? data.items : items

    const updateItem = (weekday: number, patch: Partial<CabinetScheduleItem>) => {
        setHasEdited(true)
        setItems((current) => current.map((item) => item.weekday === weekday ? { ...item, ...patch } : item))
    }

    const save = async () => {
        await updateSchedule({ id: cabinetId, items: visibleItems }).unwrap()
    }

    return (
        <section className="mt-6 border-t pt-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">{t('cabinet.schedule.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('cabinet.schedule.description')}</p>
            </div>
            <div className="space-y-3">
                {visibleItems.map((item) => (
                    <div key={item.weekday} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(110px,1fr)_120px_120px_auto] sm:items-center">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input type="checkbox" checked={item.isOpen} onChange={(event) => updateItem(item.weekday, { isOpen: event.target.checked })} />
                            {dayLabels[item.weekday]}
                        </label>
                        <input aria-label={`${dayLabels[item.weekday]} ${t('cabinet.schedule.open')}`} type="time" value={item.openTime} disabled={!item.isOpen} onChange={(event) => updateItem(item.weekday, { openTime: event.target.value })} className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50" />
                        <input aria-label={`${dayLabels[item.weekday]} ${t('cabinet.schedule.close')}`} type="time" value={item.closeTime} disabled={!item.isOpen} onChange={(event) => updateItem(item.weekday, { closeTime: event.target.value })} className="min-h-11 rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-50" />
                        <span className="text-xs text-muted-foreground">{item.isOpen ? `${item.openTime}–${item.closeTime}` : t('cabinet.schedule.closed')}</span>
                    </div>
                ))}
            </div>
            <Button type="button" onClick={() => void save()} disabled={isLoading} loading={isSaving} className="mt-4 min-h-11">
                {isSaving ? t('cabinet.schedule.saving') : t('cabinet.schedule.save')}
            </Button>
        </section>
    )
}
