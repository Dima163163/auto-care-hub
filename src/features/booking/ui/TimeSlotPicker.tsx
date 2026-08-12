import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateTimeSlots, timeSlotsOverlap } from '../lib/bookingTime'
import { useGetOccupiedSlotsQuery } from '@/entities/booking'
import { useTranslation } from '@/shared/lib/useTranslation'

type TimeSlotPickerProps = {
  cabinetId?: string
  date: string
  durationMinutes: number
  selectedStart?: string
  onSelect: (start: string, end: string) => void
  className?: string
}

export function TimeSlotPicker({
  cabinetId,
  date,
  durationMinutes,
  selectedStart,
  onSelect,
  className,
}: TimeSlotPickerProps) {
  const { t } = useTranslation()
  const { data: occupiedSlots = [], isError, isFetching } = useGetOccupiedSlotsQuery(
    { cabinetId: cabinetId!, date },
    { skip: !cabinetId || !date }
  )

  const slots = generateTimeSlots(date, durationMinutes)

  const slotOptions = slots.map((slot) => ({
    ...slot,
    isOccupied: occupiedSlots.some((occupied) =>
      timeSlotsOverlap(slot, occupied)
    ),
  }))

  if (!date || durationMinutes <= 0) {
    return (
      <div className={cn('flex min-h-24 flex-col items-center justify-center rounded-md bg-muted/30 p-5 text-center', className)}>
        <Clock className="size-8 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {t('booking.selectDateAndService')}
        </p>
      </div>
    )
  }

  if (isFetching) {
    return (
      <div className={cn('flex min-h-24 items-center justify-center rounded-md bg-muted/10', className)}>
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('flex min-h-24 flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 p-5 text-center', className)}>
        <Clock className="size-8 text-destructive/60" />
        <p className="mt-4 text-sm font-medium text-destructive">
          {t('booking.failedToLoadAvailableTimes')}
        </p>
      </div>
    )
  }

  if (!slotOptions.some((slot) => !slot.isOccupied)) {
    return (
      <div className={cn('flex min-h-24 flex-col items-center justify-center rounded-md border bg-muted/30 p-5 text-center', className)}>
        <Clock className="size-8 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {t('booking.noAvailableTimes')}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {slotOptions.map((slot) => {
        const isActive = selectedStart === slot.start

        return (
          <button
            key={slot.start}
            type="button"
            disabled={slot.isOccupied}
            onClick={() => onSelect(slot.start, slot.end)}
            className={cn(
              'group flex min-h-10 touch-manipulation flex-col items-center justify-center rounded-md border px-2 py-2 transition-all',
              slot.isOccupied ? 'opacity-30 cursor-not-allowed bg-muted/50 border-muted' : 'active:scale-[0.98]',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : !slot.isOccupied && 'hover:border-primary/50 hover:bg-muted bg-card'
            )}
          >
            <span className={cn(
                'text-sm font-bold',
                isActive ? 'text-primary-foreground' : 'text-foreground'
            )}>
              {slot.start}
            </span>
            <span className={cn(
                'text-xs font-medium opacity-60',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground'
            )}>
              {slot.start}–{slot.end}
            </span>
          </button>
        )
      })}
    </div>
  )
}
