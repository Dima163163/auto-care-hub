import { CalendarDays, Camera, ChevronDown, Clock3, LockKeyhole, Phone, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { automotiveServices, getServiceLabel, useGetAutoCareAvailabilityQuery } from '@/entities/automotive-service'
import type { ProviderOffering, ProviderProfile } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ServiceWrenchIcon } from '@/shared/ui/icons/service-wrench-icon'

type ProviderRequestPanelProps = { provider: ProviderProfile; offering: ProviderOffering }

function getDateInputValue(offset = 0) {
    const today = new Date()
    const timezoneOffset = today.getTimezoneOffset() * 60_000
    today.setDate(today.getDate() + offset)
    return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

export function ProviderRequestPanel({ provider, offering }: ProviderRequestPanelProps) {
    return <aside className="grid h-fit gap-4 lg:sticky lg:top-5"><BookingPanel provider={provider} offering={offering} /><EstimatePanel provider={provider} offering={offering} /><TrustPanel /><SupportPanel /></aside>
}

function BookingPanel({ provider, offering }: ProviderRequestPanelProps) {
    const { t, locale } = useTranslation()
    const [selectedTime, setSelectedTime] = useState('')
    const [selectedDayIndex, setSelectedDayIndex] = useState(0)
    const [customDate, setCustomDate] = useState('')
    const service = automotiveServices.find((item) => item.id === offering.serviceId)
    const days = Array.from({ length: 4 }, (_, index) => {
        const date = getDateInputValue(index)
        return { id: date, label: index === 0 ? t('autocare.providerToday') : index === 1 ? t('autocare.providerTomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${date}T12:00:00`)), date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)) }
    })
    const selectedDate = customDate || days[selectedDayIndex]?.id || days[0]!.id
    const availability = useGetAutoCareAvailabilityQuery({ providerId: provider.id, locationId: provider.locationId ?? '', offeringId: offering.id, date: selectedDate }, { skip: !provider.locationId })
    const times = availability.data?.slots.map((slot) => slot.startTime) ?? []
    const effectiveTime = times.includes(selectedTime) ? selectedTime : times[0] ?? ''

    return <section className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="text-lg font-black tracking-tight text-foreground">{t('autocare.providerBookingTitle')}</h2><p className="mt-0.5 text-xs font-semibold text-muted-foreground">{t('autocare.providerBookingStep')}</p></div><div className="grid gap-5 p-5"><BookingService label={t('autocare.requestSelectedService')} value={service ? getServiceLabel(service, locale) : offering.serviceId} price={offering.priceLabel} /><BookingVehicle /><div><p className="text-xs font-black text-foreground">{t('autocare.providerNextAvailability')}</p><div className="mt-3 grid grid-cols-4 gap-1.5">{days.map((day, index) => <button key={day.date} type="button" onClick={() => { setSelectedDayIndex(index); setCustomDate('') }} className={selectedDayIndex === index && !customDate ? 'min-h-12 rounded-[var(--radius-control)] border border-primary bg-primary/10 px-1 text-[10px] font-black text-primary' : 'min-h-12 rounded-[var(--radius-control)] border border-border px-1 text-[10px] font-bold text-muted-foreground'}><span className="block">{day.label}</span><span className="mt-0.5 block text-[9px] font-medium">{day.date}</span></button>)}</div><div className="mt-4 grid gap-1.5">{times.map((time, index) => <button key={time} type="button" onClick={() => setSelectedTime(time)} className={effectiveTime === time ? 'flex h-9 items-center justify-between rounded-[var(--radius-control)] border border-primary bg-primary/10 px-3 text-xs font-black text-primary' : 'flex h-9 items-center justify-between rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground hover:border-primary'}><span>{time}</span><span className="text-[10px] font-medium text-muted-foreground">{t('autocare.providerSeatCount', { count: index === 2 ? 1 : 2 })}</span></button>)}{availability.isLoading ? <p className="text-xs text-muted-foreground">{t('common.loading')}</p> : times.length === 0 ? <p className="text-xs text-muted-foreground">{t('booking.noAvailableTimes')}</p> : null}</div><button type="button" onClick={() => setCustomDate(customDate ? '' : getDateInputValue(4))} className="mt-3 inline-flex w-full items-center justify-center gap-1 text-xs font-bold text-primary"><span>{t('autocare.providerShowMoreTimes')}</span><ChevronDown className="size-3.5" /></button><label className="relative mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-background text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"><CalendarDays className="size-4 text-primary" />{t('autocare.providerOtherDateTime')}<input type="date" min={getDateInputValue()} value={customDate} onChange={(event) => { setCustomDate(event.target.value); setSelectedDayIndex(-1) }} className="absolute inset-0 cursor-pointer opacity-0" /> </label>{customDate ? <p className="mt-2 text-center text-[10px] font-semibold text-primary">{t('autocare.providerCustomDateSelected', { date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${customDate}T12:00:00`)), time: effectiveTime })}</p> : null}</div></div><div className="border-t border-border p-5 pt-4"><Link to={`${routePaths.serviceRequest(provider.id, offering.serviceId)}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(effectiveTime)}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><CalendarDays className="size-4" />{t('autocare.providerContinue')}</Link><p className="mt-3 text-center text-[11px] font-medium text-muted-foreground">{t('autocare.providerDirectPayment')}</p></div></section>
}

function BookingService({ label, value, price }: { label: string; value: string; price: string }) {
    return <div><p className="text-xs font-black text-foreground">{label}</p><div className="mt-2 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><ServiceWrenchIcon className="size-5" /></span><p className="min-w-0 text-xs font-bold leading-5 text-muted-foreground"><span className="block text-foreground">{value}</span>{price}</p></div></div>
}

function BookingVehicle() {
    const { t } = useTranslation()
    return <div className="border-y border-border py-4"><p className="text-xs font-black text-foreground">{t('autocare.providerVehicleLabel')}</p><div className="mt-2 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hero-overlay text-xs font-black text-primary-foreground">BMW</span><p className="min-w-0 flex-1 text-xs font-bold leading-5"><span className="block text-foreground">{t('autocare.providerVehicleValue')}</span><span className="text-muted-foreground">{t('autocare.providerVehicleDetails')}</span></p><button type="button" className="text-xs font-bold text-primary">{t('autocare.providerChangeVehicle')}</button></div></div>
}

function EstimatePanel({ provider, offering }: ProviderRequestPanelProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    return <section id="request" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><button type="button" onClick={() => setIsOpen((value) => !value)} className="flex w-full items-start justify-between gap-3 text-left"><div><h2 className="text-lg font-black tracking-tight text-foreground">{t('autocare.providerRequestTitle')}</h2><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.providerRequestDescription')}</p></div><Clock3 className="mt-1 size-5 shrink-0 text-primary" /></button>{isOpen && <EstimateRequestForm provider={provider} offering={offering} />}</section>
}

function TrustPanel() {
    const { t } = useTranslation()
    return <section className="grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><TrustItem icon={<ShieldCheck className="size-5" />} title={t('autocare.providerWarrantyTitle')} description={t('autocare.providerWarrantyDescription')} /><TrustItem icon={<LockKeyhole className="size-5" />} title={t('autocare.providerSecureBooking')} description={t('autocare.providerSecureBookingDescription')} /></section>
}

function SupportPanel() {
    const { t } = useTranslation()
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><Phone className="size-4" /></span><div><h2 className="text-xs font-black text-foreground">{t('autocare.providerSupportTitle')}</h2><a href="tel:+74956453535" className="mt-1.5 inline-flex text-xs font-bold text-primary">+7 (495) 645-35-35</a><p className="mt-1 text-[10px] font-medium text-muted-foreground">{t('autocare.providerSupportHours')}</p></div></div></section>
}

function TrustItem({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
    return <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary">{icon}</span><p className="text-xs font-bold leading-4"><span className="block text-foreground">{title}</span><span className="block text-[10px] font-semibold text-muted-foreground">{description}</span></p></div>
}

function EstimateRequestForm({ provider, offering }: ProviderRequestPanelProps) { const { t } = useTranslation(); return <div className="mt-5 grid gap-3"><textarea required rows={3} className="resize-y rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-medium outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40" placeholder={t('autocare.providerMessagePlaceholder')} /><label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border px-3 text-xs font-bold text-muted-foreground transition hover:border-primary hover:text-primary"><Camera className="size-4 text-primary" />{t('autocare.providerAttachPhoto')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label><Link to={routePaths.serviceRequest(provider.id, offering.serviceId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"><Send className="size-4" />{t('autocare.providerSendRequest')}</Link></div> }
