import { CalendarDays, Camera, Check, Clock3, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useTranslation } from '@/shared/lib/useTranslation'

type RequestFormProps = {
    onSubmit: (payload: RequestFormPayload) => void
    isSubmitting?: boolean
    errorMessage?: string
}

export type RequestFormPayload = {
    preferredAt: string
    vehicleSnapshot: { make: string; model: string; year: number }
    contactSnapshot: { name: string; email: string; phone: string }
    note: string | null
}

const appointmentDates = ['today', 'tomorrow', 'day-2', 'day-3']

const appointmentTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

export function RequestForm({ onSubmit, isSubmitting = false, errorMessage }: RequestFormProps) {
    const { t, locale } = useTranslation()
    const [selectedDate, setSelectedDate] = useState('today')
    const [customDate, setCustomDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('10:00')
    const [contactSnapshot, setContactSnapshot] = useState({ name: '', phone: '', email: '' })
    const [note, setNote] = useState('')

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const dayIndex = appointmentDates.indexOf(selectedDate)
        const date = customDate ? new Date(`${customDate}T12:00:00`) : getFutureDate(Math.max(dayIndex, 0))
        const [hours, minutes] = selectedTime.split(':').map(Number)
        date.setHours(hours, minutes, 0, 0)
        onSubmit({
            preferredAt: date.toISOString(),
            vehicleSnapshot: { make: 'BMW', model: 'X5', year: 2021 },
            contactSnapshot,
            note: note.trim() || null,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-5 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">
            <AppointmentPicker locale={locale} selectedDate={selectedDate} customDate={customDate} selectedTime={selectedTime} onDateChange={(value) => { setCustomDate(''); setSelectedDate(value) }} onCustomDateChange={(value) => { setCustomDate(value); setSelectedDate('') }} onTimeChange={setSelectedTime} />
            <VehicleAndContacts values={contactSnapshot} onChange={setContactSnapshot} />
            <RequestDetails note={note} onNoteChange={setNote} />
            <label className="flex gap-3 text-xs font-medium leading-5 text-muted-foreground"><input type="checkbox" required className="mt-0.5 size-4 accent-primary" />{t('autocare.requestCustomerConfirmation')}</label>
            {errorMessage && <p role="alert" className="rounded-[var(--radius-control)] bg-status-danger-surface px-3 py-2 text-sm font-semibold text-status-danger-foreground">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"><Send className="size-4" />{isSubmitting ? '…' : t('autocare.requestSubmit')}</button>
        </form>
    )
}

type AppointmentPickerProps = {
    locale: string
    selectedDate: string
    customDate: string
    selectedTime: string
    onDateChange: (date: string) => void
    onCustomDateChange: (date: string) => void
    onTimeChange: (time: string) => void
}

function AppointmentPicker({ locale, selectedDate, customDate, selectedTime, onDateChange, onCustomDateChange, onTimeChange }: AppointmentPickerProps) {
    const { t } = useTranslation()
    const days = appointmentDates.map((id, index) => ({
        id,
        label: index === 0 ? t('autocare.providerToday') : index === 1 ? t('autocare.providerTomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(getFutureDate(index)),
        date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(getFutureDate(index)),
    }))
    const selectedDateLabel = customDate
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(`${customDate}T12:00:00`))
        : days.find((day) => day.id === selectedDate)?.label ?? t('autocare.providerToday')

    return (
        <section>
            <div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.requestDateTimeTitle')}</h2></div>
            <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(220px,0.75fr)_minmax(0,1fr)]">
                <div className="rounded-[var(--radius-card)] border border-border p-4">
                    <p className="text-xs font-bold text-foreground">{t('autocare.requestDateLabel')}</p>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {days.map(({ id, label, date }) => <button key={id} type="button" onClick={() => onDateChange(id)} className={!customDate && selectedDate === id ? 'min-h-14 rounded-[var(--radius-control)] border border-primary bg-primary/10 px-1 text-[10px] font-black text-primary' : 'min-h-14 rounded-[var(--radius-control)] border border-border px-1 text-[10px] font-bold text-muted-foreground transition hover:border-primary hover:text-primary'}><span className="block">{label}</span><span className="mt-1 block text-[9px] font-medium">{date}</span></button>)}
                    </div>
                    <label className="relative mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border text-xs font-bold text-foreground hover:border-primary hover:text-primary"><CalendarDays className="size-4 text-primary" />{t('autocare.providerOtherDateTime')}<input type="date" value={customDate} onChange={(event) => onCustomDateChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
                </div>
                <div className="rounded-[var(--radius-card)] border border-border p-4">
                    <p className="text-xs font-bold text-foreground">{t('autocare.requestTimeLabel')}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {appointmentTimes.map((time) => <button key={time} type="button" onClick={() => onTimeChange(time)} className={selectedTime === time ? 'h-10 rounded-[var(--radius-control)] border border-primary bg-primary text-xs font-black text-primary-foreground shadow-sm' : 'h-10 rounded-[var(--radius-control)] border border-border text-xs font-bold text-foreground transition hover:border-primary hover:text-primary'}>{time}</button>)}
                    </div>
                    <p className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground"><Clock3 className="size-4 text-primary" />{t('autocare.requestSelectedDateTime', { date: selectedDateLabel, time: selectedTime })}</p>
                </div>
            </div>
        </section>
    )
}

function VehicleAndContacts({ values, onChange }: { values: { name: string; phone: string; email: string }; onChange: (values: { name: string; phone: string; email: string }) => void }) {
    const { t } = useTranslation()

    return (
        <section className="grid gap-5 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-4">
                <div><p className="text-xs font-bold text-muted-foreground">{t('autocare.providerVehicleLabel')}</p><p className="mt-1 text-sm font-black text-foreground">{t('autocare.providerVehicleValue')}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{t('autocare.providerVehicleDetails')}</p></div>
                <button type="button" className="text-xs font-black text-primary">{t('autocare.requestChangeVehicle')}</button>
            </div>
            <div><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.requestContactTitle')}</h2><span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success-foreground"><Check className="size-3.5" />{t('autocare.requestDataSecure')}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><input required value={values.name} onChange={(event) => onChange({ ...values, name: event.target.value })} aria-label={t('autocare.requestNamePlaceholder')} placeholder={t('autocare.requestNamePlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /><input required value={values.phone} onChange={(event) => onChange({ ...values, phone: event.target.value })} aria-label={t('autocare.requestPhonePlaceholder')} placeholder={t('autocare.requestPhonePlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /><input type="email" required value={values.email} onChange={(event) => onChange({ ...values, email: event.target.value })} aria-label={t('autocare.requestEmailPlaceholder')} placeholder={t('autocare.requestEmailPlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /></div></div>
        </section>
    )
}

function getFutureDate(offset: number) {
    const date = new Date()

    date.setDate(date.getDate() + offset)

    return date
}

function RequestDetails({ note, onNoteChange }: { note: string; onNoteChange: (note: string) => void }) {
    const { t } = useTranslation()

    return <section className="border-t border-border pt-5"><label className="grid gap-2 text-xs font-bold text-foreground">{t('autocare.requestNoteLabel')}<textarea rows={4} value={note} onChange={(event) => onNoteChange(event.target.value)} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.requestNotePlaceholder')} /></label><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{t('autocare.requestAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label></section>
}
