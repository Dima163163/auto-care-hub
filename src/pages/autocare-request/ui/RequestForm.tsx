import { CalendarDays, Camera, Check, Clock3, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useTranslation } from '@/shared/lib/useTranslation'

type RequestFormProps = {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const appointmentDates = ['Сегодня', 'Завтра', 'Пт, 16', 'Сб, 17']
const appointmentTimes = ['09:00', '10:00', '11:30', '13:00', '14:30', '15:00', '16:00', '17:30', '18:30']

export function RequestForm({ onSubmit }: RequestFormProps) {
    const { t } = useTranslation()
    const [selectedDate, setSelectedDate] = useState(appointmentDates[0])
    const [selectedTime, setSelectedTime] = useState('14:30')

    return (
        <form onSubmit={onSubmit} className="grid gap-6 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6">
            <AppointmentPicker selectedDate={selectedDate} selectedTime={selectedTime} onDateChange={setSelectedDate} onTimeChange={setSelectedTime} />
            <VehicleAndContacts />
            <RequestDetails />
            <label className="flex gap-3 text-xs font-medium leading-5 text-muted-foreground"><input type="checkbox" required className="mt-1 size-4 accent-primary" />{t('autocare.requestCustomerConfirmation')}</label>
            <p className="rounded-[var(--radius-card)] bg-status-success-surface p-3 text-xs font-semibold leading-5 text-status-success-foreground">{t('autocare.requestProviderConfirmation')} {t('autocare.requestDirectPayment')}</p>
            <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><Send className="size-4" />{t('autocare.requestSubmit')}</button>
        </form>
    )
}

function AppointmentPicker({ selectedDate, selectedTime, onDateChange, onTimeChange }: { selectedDate: string; selectedTime: string; onDateChange: (date: string) => void; onTimeChange: (time: string) => void }) {
    const { t } = useTranslation()
    return <section><div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.requestDateTimeTitle')}</h2></div><div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('autocare.requestDateLabel')}</p><div className="mt-3 grid grid-cols-2 gap-2">{appointmentDates.map((date) => <button key={date} type="button" onClick={() => onDateChange(date)} className={selectedDate === date ? 'h-11 rounded-[var(--radius-control)] border border-primary bg-primary/10 text-xs font-black text-primary' : 'h-11 rounded-[var(--radius-control)] border border-border text-xs font-bold text-foreground transition hover:border-primary hover:text-primary'}>{date}</button>)}</div></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('autocare.requestTimeLabel')}</p><div className="mt-3 grid grid-cols-3 gap-2">{appointmentTimes.map((time) => <button key={time} type="button" onClick={() => onTimeChange(time)} className={selectedTime === time ? 'h-10 rounded-[var(--radius-control)] border border-primary bg-primary text-xs font-black text-primary-foreground shadow-sm' : 'h-10 rounded-[var(--radius-control)] border border-border text-xs font-bold text-foreground transition hover:border-primary hover:text-primary'}>{time}</button>)}</div></div></div><p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Clock3 className="size-3.5 text-primary" />{t('autocare.requestSelectedDateTime', { date: selectedDate, time: selectedTime })}</p></section>
}

function VehicleAndContacts() {
    const { t } = useTranslation()
    return <section className="border-t border-border pt-6"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.requestContactTitle')}</h2><span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success-foreground"><Check className="size-3.5" />{t('autocare.requestDataSecure')}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><input required aria-label={t('autocare.requestNamePlaceholder')} placeholder={t('autocare.requestNamePlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /><input required aria-label={t('autocare.requestPhonePlaceholder')} placeholder={t('autocare.requestPhonePlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /><input type="email" required aria-label={t('autocare.requestEmailPlaceholder')} placeholder={t('autocare.requestEmailPlaceholder')} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" /></div><div className="mt-4 flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-secondary p-4"><div><p className="text-sm font-black text-secondary-foreground">BMW X5, 2021</p><p className="mt-1 text-xs font-medium text-muted-foreground">{t('autocare.requestVehicleHint')}</p></div><button type="button" className="text-xs font-black text-primary">{t('autocare.requestChangeVehicle')}</button></div></section>
}

function RequestDetails() {
    const { t } = useTranslation()
    return <section className="border-t border-border pt-6"><label className="grid gap-2 text-xs font-bold text-foreground">{t('autocare.requestNoteLabel')}<textarea rows={4} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.requestNotePlaceholder')} /></label><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{t('autocare.requestAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label></section>
}
