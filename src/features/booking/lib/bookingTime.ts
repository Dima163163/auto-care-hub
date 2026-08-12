import { addMinutes, format, parse } from 'date-fns'

export type TimeSlot = {
  start: string
  end: string
}

export function normalizeBookingTime(time: string) {
  return time.slice(0, 5)
}

export function timeSlotsOverlap(first: TimeSlot, second: TimeSlot) {
  const firstStart = normalizeBookingTime(first.start)
  const firstEnd = normalizeBookingTime(first.end)
  const secondStart = normalizeBookingTime(second.start)
  const secondEnd = normalizeBookingTime(second.end)

  return firstStart < secondEnd && firstEnd > secondStart
}

export function generateTimeSlots(
  date: string,
  durationMinutes: number,
  startHour = 8,
  endHour = 22,
  now = new Date()
): TimeSlot[] {
  if (!date || durationMinutes <= 0) {
    return []
  }

  const slots: TimeSlot[] = []
  let current = parse(`${date} ${startHour}:00`, 'yyyy-MM-dd H:mm', new Date())
  const end = parse(`${date} ${endHour}:00`, 'yyyy-MM-dd H:mm', new Date())
  const today = format(now, 'yyyy-MM-dd')

  while (current < end) {
    const slotEnd = addMinutes(current, durationMinutes)
    if (slotEnd <= end && (date !== today || current > now)) {
      slots.push({
        start: format(current, 'HH:mm'),
        end: format(slotEnd, 'HH:mm'),
      })
    }
    current = addMinutes(current, 30)
  }

  return slots
}
