import { addDays, format, startOfDay } from 'date-fns'
import { ChevronRight, Clock3 } from 'lucide-react'
import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form'

import type { Service } from '@/entities/service'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { CreateClientBookingFormValues } from '../../lib/bookingFormValidation'
import { ClientBookingField } from './ClientBookingField'
import { TimeSlotPicker } from '../../ui/TimeSlotPicker'

type CreateClientBookingFormFieldsProps = {
    cabinetId: string
    errors: FieldErrors<CreateClientBookingFormValues>
    setValue: UseFormSetValue<CreateClientBookingFormValues>
    watch: UseFormWatch<CreateClientBookingFormValues>
    register: UseFormRegister<CreateClientBookingFormValues>
    services: Service[]
}

function getDateOptions() {
    const today = startOfDay(new Date())

    return Array.from({ length: 7 }, (_, index) => addDays(today, index + 1))
}

export function CreateClientBookingFormFields({
    cabinetId,
    errors,
    setValue,
    watch,
    register,
    services,
}: CreateClientBookingFormFieldsProps) {
    const { t } = useTranslation()
    const selectedServiceId = watch('serviceId')
    const selectedDate = watch('date')
    const selectedStartTime = watch('startTime')
    const selectedEndTime = watch('endTime')
    const selectedService = services.find((service) => service.id === selectedServiceId)
    const durationMinutes = selectedService?.durationMinutes ?? 0
    const dateOptions = getDateOptions()

    return (
        <div className="mt-5 space-y-5">
            <ClientBookingField
                error={errors.serviceId?.message}
                errorId="serviceId-error"
                htmlFor="serviceId"
                label={t('booking.selectService')}
            >
                <div className="grid gap-2">
                    {services.map((service) => {
                        const isSelected = selectedServiceId === service.id

                        return (
                            <button
                                key={service.id}
                                type="button"
                                onClick={() => {
                                    setValue('serviceId', service.id, { shouldValidate: true })
                                    setValue('startTime', '')
                                    setValue('endTime', '')
                                }}
                                className={`flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isSelected
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                        : 'bg-background hover:border-primary/40 hover:bg-muted/40'
                                }`}
                                aria-pressed={isSelected}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">
                                        {service.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {service.durationMinutes} {t('booking.minutesShort')}
                                    </span>
                                </span>
                                <span className="shrink-0 text-sm font-semibold">
                                    {formatCurrency(service.price)}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </ClientBookingField>

            <ClientBookingField
                error={errors.date?.message}
                errorId="date-error"
                htmlFor="date"
                label={t('booking.selectDate')}
            >
                <input id="date" type="hidden" {...register('date')} />
                <div role="grid" aria-label={t('booking.selectDate')} className="grid grid-cols-7 overflow-hidden rounded-md border">
                    {dateOptions.map((date) => {
                        const dateValue = format(date, 'yyyy-MM-dd')
                        const isSelected = selectedDate === dateValue

                        return (
                            <div key={dateValue} role="gridcell">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setValue('date', dateValue, { shouldValidate: true })
                                        setValue('startTime', '')
                                        setValue('endTime', '')
                                    }}
                                    className={`flex min-h-[58px] w-full flex-col items-center justify-center border-r px-1 text-center text-xs transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                        isSelected
                                            ? 'bg-primary/5 font-semibold text-primary'
                                            : 'bg-background text-muted-foreground hover:bg-muted/60'
                                    }`}
                                    aria-pressed={isSelected}
                                >
                                    <span className="font-medium">{format(date, 'EEE')}</span>
                                    <span className="mt-1 text-xs">{format(date, 'MMM d')}</span>
                                </button>
                            </div>
                        )
                    })}
                </div>
            </ClientBookingField>

            <ClientBookingField
                error={errors.startTime?.message}
                errorId="startTime-error"
                htmlFor="startTime"
                label={t('booking.selectTime')}
            >
                <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-status-success-foreground" />{t('booking.available')}</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-status-warning-foreground" />{t('booking.limited')}</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-muted-foreground/40" />{t('booking.unavailable')}</span>
                </div>
                <div className="max-h-[250px] overflow-y-auto rounded-md border bg-background/70 p-2 custom-scrollbar">
                    <TimeSlotPicker
                        cabinetId={cabinetId}
                        date={selectedDate}
                        durationMinutes={durationMinutes}
                        selectedStart={selectedStartTime}
                        onSelect={(start, end) => {
                            setValue('startTime', start, { shouldValidate: true })
                            setValue('endTime', end, { shouldValidate: true })
                        }}
                    />
                </div>
            </ClientBookingField>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] items-center gap-3 border-t pt-4">
                <div>
                    <p className="text-sm font-semibold">{t('booking.duration')}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {selectedService ? `${durationMinutes} ${t('booking.minutesShort')}` : t('booking.selectDateAndService')}
                    </p>
                </div>
                <div className="rounded-md border bg-background px-3 py-2 text-right text-sm font-semibold">
                    {selectedService ? `${durationMinutes} ${t('booking.minutesShort')}` : '—'}
                    <ChevronRight className="ml-1 inline size-4 text-muted-foreground" />
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex items-start justify-between gap-4 text-sm">
                    <div>
                        <p className="font-semibold">{selectedService?.title ?? t('booking.selectService')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {selectedDate && selectedStartTime
                                ? `${durationMinutes} ${t('booking.minutesShort')} · ${selectedDate} ${selectedStartTime}`
                                : t('booking.chooseServiceAndTime')}
                        </p>
                    </div>
                    <p className="shrink-0 font-bold">
                        {selectedService ? formatCurrency(selectedService.price) : '—'}
                    </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="font-bold">{t('booking.total')}</span>
                    <span className="text-lg font-black">
                        {selectedService ? formatCurrency(selectedService.price) : '—'}
                    </span>
                </div>
                <input type="hidden" {...register('endTime')} value={selectedEndTime} readOnly />
            </div>

            <details className="rounded-md border bg-background px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                    {t('booking.addNote')}
                </summary>
                <textarea
                    id="comment"
                    rows={2}
                    className="mt-3 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    placeholder={t('booking.optionalComment')}
                    aria-invalid={Boolean(errors.comment)}
                    aria-describedby={errors.comment ? 'comment-error' : undefined}
                    {...register('comment')}
                />
                {errors.comment?.message && (
                    <p id="comment-error" className="mt-1 text-sm text-destructive">
                        {errors.comment.message}
                    </p>
                )}
            </details>
        </div>
    )
}
