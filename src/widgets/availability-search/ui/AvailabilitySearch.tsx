import type { FormEvent } from 'react'
import { useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, MapPin, Search } from 'lucide-react'
import { useNavigate } from 'react-router'

import { routePaths } from '@/shared/constants/routes'
import { getLocalDateInputValue } from '@/shared/lib/getLocalDateInputValue'
import { useTranslation } from '@/shared/lib/useTranslation'

const durationOptions = [30, 60, 90, 120] as const

type AvailabilitySearchProps = {
    variant?: 'card' | 'hero' | 'tabletHero'
}

export function AvailabilitySearch({ variant = 'card' }: AvailabilitySearchProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const today = getLocalDateInputValue()
    const isHero = variant === 'hero'
    const isTabletHero = variant === 'tabletHero'
    const [city, setCity] = useState('')
    const [service, setService] = useState('')
    const [date, setDate] = useState(today)
    const [duration, setDuration] = useState('60')

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigate(routePaths.cabinets({
            city,
            service,
            date,
            duration,
            availableToday: date === today,
        }))
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={isHero || isTabletHero
                ? 'mt-7 rounded-xl border border-border/70 bg-card/95 p-3 shadow-xl shadow-foreground/10 backdrop-blur'
                : 'mt-8 rounded-xl border border-border bg-card p-4 shadow-lg shadow-foreground/5'}
        >
            {!isHero && !isTabletHero && <div className="mb-4">
                <h2 className="text-base font-black text-foreground">
                    {t('landing.availabilitySearchTitle')}
                </h2>
                <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                    {t('landing.availabilitySearchHint')}
                </p>
            </div>}

            <div className={isHero
                ? 'grid min-w-0 gap-1.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_auto]'
                : isTabletHero
                    ? 'grid min-w-0 gap-2 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_auto]'
                    : 'grid gap-3 sm:grid-cols-2'}>
                <label className="block min-w-0">
                    <span className={isHero || isTabletHero ? 'sr-only' : 'mb-1.5 block text-xs font-bold text-muted-foreground'}>
                        {t('landing.availabilityCityLabel')}
                    </span>
                    <span className="relative block">
                        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                            placeholder={t('landing.availabilityCityPlaceholder')}
                            className={isHero || isTabletHero
                                ? 'h-12 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
                                : 'h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'}
                        />
                    </span>
                </label>

                <label className="block min-w-0">
                    <span className={isHero || isTabletHero ? 'sr-only' : 'mb-1.5 block text-xs font-bold text-muted-foreground'}>
                        {t('landing.availabilityServiceLabel')}
                    </span>
                    <span className="relative block">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            value={service}
                            onChange={(event) => setService(event.target.value)}
                            placeholder={t('landing.availabilityServicePlaceholder')}
                            className={isHero || isTabletHero
                                ? 'h-12 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
                                : 'h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'}
                        />
                    </span>
                </label>

                <label className="block min-w-0">
                    <span className={isHero || isTabletHero ? 'sr-only' : 'mb-1.5 block text-xs font-bold text-muted-foreground'}>
                        {t('booking.date')}
                    </span>
                    <span className="relative block">
                        <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                            aria-label={t('booking.date')}
                            className={isHero || isTabletHero
                                ? 'h-12 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
                                : 'h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'}
                        />
                    </span>
                </label>

                <label className="block min-w-0">
                    <span className={isHero || isTabletHero ? 'sr-only' : 'mb-1.5 block text-xs font-bold text-muted-foreground'}>
                        {t('landing.availabilityDurationLabel')}
                    </span>
                    <span className="relative block">
                        <Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <select
                            value={duration}
                            onChange={(event) => setDuration(event.target.value)}
                            aria-label={t('landing.availabilityDurationLabel')}
                            className={isHero || isTabletHero
                                ? 'h-12 w-full appearance-none rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
                                : 'h-11 w-full appearance-none rounded-md border border-border bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'}
                        >
                            {durationOptions.map((minutes) => (
                                <option key={minutes} value={minutes}>
                                    {t('service.form.durationMinutes', { count: minutes })}
                                </option>
                            ))}
                        </select>
                    </span>
                </label>
                <button
                    type="submit"
                    className={isHero
                        ? 'flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                        : isTabletHero
                            ? 'col-span-full mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:col-span-1 lg:mt-0'
                            : 'col-span-full mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'}
                >
                    {t('landing.findAvailability')}
                    <ArrowRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </form>
    )
}
