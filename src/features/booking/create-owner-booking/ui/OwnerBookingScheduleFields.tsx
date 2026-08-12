import { format } from 'date-fns'
import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form'

import { useTranslation } from '@/shared/lib/useTranslation'
import { Calendar } from '@/shared/ui/calendar'
import type { Service } from '@/entities/service'

import type { CreateOwnerBookingFormValues } from '../../lib/bookingFormValidation'
import { OwnerBookingField } from './OwnerBookingField'
import { TimeSlotPicker } from '../../ui/TimeSlotPicker'

type OwnerBookingScheduleFieldsProps = {
    cabinetId: string
    errors: FieldErrors<CreateOwnerBookingFormValues>
    setValue: UseFormSetValue<CreateOwnerBookingFormValues>
    watch: UseFormWatch<CreateOwnerBookingFormValues>
    register: UseFormRegister<CreateOwnerBookingFormValues>
    availableServices: Service[]
}

export function OwnerBookingScheduleFields({
    cabinetId,
    errors,
    setValue,
    watch,
    register,
    availableServices,
}: OwnerBookingScheduleFieldsProps) {
    const { t } = useTranslation()

    const selectedServiceId = watch('serviceId')
    const selectedDate = watch('date')
    const selectedStartTime = watch('startTime')

    const selectedService = availableServices.find(s => s.id === selectedServiceId)
    const durationMinutes = selectedService?.durationMinutes ?? 0

    return (
        <>
            <OwnerBookingField
                error={errors.date?.message}
                errorId="date-error"
                htmlFor="date"
                label={t('booking.date')}
            >
                <div className="mt-2 rounded-xl border bg-card/60 p-2 sm:p-4 shadow-sm backdrop-blur-md flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate ? new Date(selectedDate) : undefined}
                        onSelect={(date) => {
                            if (date) {
                                setValue('date', format(date, 'yyyy-MM-dd'), { shouldValidate: true })
                            }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="w-full max-w-[350px]"
                    />
                </div>
            </OwnerBookingField>

            <OwnerBookingField
                error={errors.startTime?.message}
                errorId="startTime-error"
                htmlFor="startTime"
                label={t('booking.time')}
            >
                <div className="mt-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
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
            </OwnerBookingField>

            <OwnerBookingField
                error={errors.comment?.message}
                errorId="comment-error"
                htmlFor="comment"
                label={t('booking.comment')}
                wide
            >
                <textarea
                    id="comment"
                    rows={3}
                    placeholder={t('booking.optionalBookingNote')}
                    aria-invalid={Boolean(errors.comment)}
                    aria-describedby={errors.comment ? 'comment-error' : undefined}
                    className="mt-2 w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('comment')}
                />
            </OwnerBookingField>
        </>
    )
}
