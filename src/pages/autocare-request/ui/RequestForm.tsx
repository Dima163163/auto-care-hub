import { CalendarDays, Camera, Check, Clock3, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'

import { useGetAutoCareAvailabilityQuery, type AutoCareAvailability } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type RequestFormProps = {
    providerId: string
    locationId: string
    offeringId: string
    initialVehicle?: RequestFormPayload['vehicleSnapshot']
    onSubmit: (payload: RequestFormPayload) => void
    isSubmitting?: boolean
    errorMessage?: string
}

type EditableVehicle = { make: string; model: string; year: number }

export type RequestFormPayload = {
    preferredAt: string
    vehicleSnapshot: { make: string; model: string; year: number } | null
    contactSnapshot: { name: string; email: string; phone: string }
    note: string | null
    files: File[]
}

const appointmentDates = ['today', 'tomorrow', 'day-2', 'day-3']

export function RequestForm({ providerId, locationId, offeringId, initialVehicle, onSubmit, isSubmitting = false, errorMessage }: RequestFormProps) {
    const { t, locale } = useTranslation()
    const [searchParams] = useSearchParams()
    const initialDate = searchParams.get('date') ?? ''
    const [selectedDate, setSelectedDate] = useState(initialDate ? '' : 'today')
    const [customDate, setCustomDate] = useState(initialDate)
    const [selectedTime, setSelectedTime] = useState(searchParams.get('time') ?? '')
    const [contactSnapshot, setContactSnapshot] = useState({ name: '', phone: '', email: '' })
    const [vehicleSnapshot, setVehicleSnapshot] = useState<EditableVehicle>(initialVehicle ?? { make: '', model: '', year: new Date().getFullYear() })
    const [files, setFiles] = useState<File[]>([])
    const [note, setNote] = useState('')
    const availabilityDate = customDate || toDateInputValue(getFutureDate(Math.max(appointmentDates.indexOf(selectedDate), 0)))
    const { data: availability, isError: isAvailabilityError, isFetching: isAvailabilityLoading } = useGetAutoCareAvailabilityQuery({ providerId, locationId, offeringId, date: availabilityDate })
    const availableTimes = availability?.slots.map((slot) => slot.startTime) ?? []
    const effectiveSelectedTime = availableTimes.includes(selectedTime) ? selectedTime : availableTimes[0] ?? ''

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!effectiveSelectedTime) return
        const dayIndex = appointmentDates.indexOf(selectedDate)
        const date = customDate ? new Date(`${customDate}T12:00:00`) : getFutureDate(Math.max(dayIndex, 0))
        const [hours, minutes] = effectiveSelectedTime.split(':').map(Number)
        date.setHours(hours, minutes, 0, 0)
        onSubmit({
            preferredAt: date.toISOString(),
            vehicleSnapshot: vehicleSnapshot.make.trim() && vehicleSnapshot.model.trim() && vehicleSnapshot.year > 0 ? { make: vehicleSnapshot.make.trim(), model: vehicleSnapshot.model.trim(), year: vehicleSnapshot.year } : null,
            contactSnapshot,
            note: note.trim() || null,
            files,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-5 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">
            <AppointmentPicker locale={locale} selectedDate={selectedDate} customDate={customDate} selectedTime={effectiveSelectedTime} availability={availability} isLoading={isAvailabilityLoading} onDateChange={(value) => { setCustomDate(''); setSelectedDate(value) }} onCustomDateChange={(value) => { setCustomDate(value); setSelectedDate('') }} onTimeChange={setSelectedTime} />
            <VehicleAndContacts values={contactSnapshot} onChange={setContactSnapshot} vehicle={vehicleSnapshot} onVehicleChange={setVehicleSnapshot} />
            <RequestDetails note={note} onNoteChange={setNote} files={files} onFilesChange={setFiles} />
            <label className="flex gap-3 text-xs font-medium leading-5 text-muted-foreground"><input type="checkbox" required className="mt-0.5 size-4 accent-primary" />{t('autocare.requestCustomerConfirmation')}</label>
            {errorMessage && <p role="alert" className="rounded-[var(--radius-control)] bg-status-danger-surface px-3 py-2 text-sm font-semibold text-status-danger-foreground">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting || isAvailabilityLoading || !effectiveSelectedTime} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"><Send className="size-4" />{isSubmitting ? '…' : t('autocare.requestSubmit')}</button>
            {isAvailabilityError ? <p role="alert" className="text-xs font-semibold text-status-danger-foreground">Не удалось загрузить доступность. Обновите дату или попробуйте позже.</p> : null}
        </form>
    )
}

type AppointmentPickerProps = {
    locale: string
    selectedDate: string
    customDate: string
    selectedTime: string
    availability?: AutoCareAvailability
    isLoading?: boolean
    onDateChange: (date: string) => void
    onCustomDateChange: (date: string) => void
    onTimeChange: (time: string) => void
}

function AppointmentPicker({ locale, selectedDate, customDate, selectedTime, availability, isLoading = false, onDateChange, onCustomDateChange, onTimeChange }: AppointmentPickerProps) {
    const { t } = useTranslation()
    const days = appointmentDates.map((id, index) => ({
        id,
        label: index === 0 ? t('autocare.providerToday') : index === 1 ? t('autocare.providerTomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(getFutureDate(index)),
        date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(getFutureDate(index)),
    }))
    const selectedDateLabel = customDate
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(`${customDate}T12:00:00`))
        : days.find((day) => day.id === selectedDate)?.label ?? t('autocare.providerToday')
    const times = availability?.slots.map((slot) => slot.startTime) ?? []

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
                        {times.map((time) => <button key={time} type="button" onClick={() => onTimeChange(time)} className={selectedTime === time ? 'h-10 rounded-[var(--radius-control)] border border-primary bg-primary text-xs font-black text-primary-foreground shadow-sm' : 'h-10 rounded-[var(--radius-control)] border border-border text-xs font-bold text-foreground transition hover:border-primary hover:text-primary'}>{time}</button>)}
                    </div>
                    {isLoading ? <p className="mt-3 text-xs font-semibold text-muted-foreground">Проверяем свободные слоты…</p> : times.length === 0 ? <p className="mt-3 text-xs font-semibold text-status-danger-foreground">На эту дату свободных слотов нет.</p> : null}
                    <p className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground"><Clock3 className="size-4 text-primary" />{t('autocare.requestSelectedDateTime', { date: selectedDateLabel, time: selectedTime })}</p>
                </div>
            </div>
        </section>
    )
}

function VehicleAndContacts({ values, onChange, vehicle, onVehicleChange }: { values: { name: string; phone: string; email: string }; onChange: (values: { name: string; phone: string; email: string }) => void; vehicle: { make: string; model: string; year: number }; onVehicleChange: (vehicle: { make: string; model: string; year: number }) => void }) {
    const { t } = useTranslation()
    const [isEditingVehicle, setIsEditingVehicle] = useState(false)

    return (
        <section className="grid gap-5 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-4">
                <div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted-foreground">{t('autocare.providerVehicleLabel')}</p>{isEditingVehicle ? <div className="mt-2 grid gap-2 sm:grid-cols-3"><input value={vehicle.make} onChange={(event) => onVehicleChange({ ...vehicle, make: event.target.value })} placeholder="Make" aria-label="Vehicle make" className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /><input value={vehicle.model} onChange={(event) => onVehicleChange({ ...vehicle, model: event.target.value })} placeholder="Model" aria-label="Vehicle model" className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /><input type="number" min="1900" max={new Date().getFullYear() + 1} value={vehicle.year} onChange={(event) => onVehicleChange({ ...vehicle, year: Number(event.target.value) })} placeholder="Year" aria-label="Vehicle year" className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /></div> : <><p className="mt-1 text-sm font-black text-foreground">{vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : t('autocare.providerVehicleValue')}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{vehicle.make && vehicle.model ? String(vehicle.year) : t('autocare.providerVehicleDetails')}</p></>}</div>
                <button type="button" onClick={() => setIsEditingVehicle((value) => !value)} className="text-xs font-black text-primary">{t('autocare.requestChangeVehicle')}</button>
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

function toDateInputValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function RequestDetails({ note, onNoteChange, files, onFilesChange }: { note: string; onNoteChange: (note: string) => void; files: File[]; onFilesChange: (files: File[]) => void }) {
    const { t } = useTranslation()

    return <section className="border-t border-border pt-5"><label className="grid gap-2 text-xs font-bold text-foreground">{t('autocare.requestNoteLabel')}<textarea rows={4} maxLength={4000} value={note} onChange={(event) => onNoteChange(event.target.value)} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.requestNotePlaceholder')} /></label><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{files.length ? `${t('autocare.requestAttachPhoto')} (${files.length})` : t('autocare.requestAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { const next = Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024).slice(0, 6); onFilesChange(next); event.target.value = '' }} /></label></section>
}
