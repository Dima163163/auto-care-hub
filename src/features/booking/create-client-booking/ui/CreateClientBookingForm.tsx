import { useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CalendarPlus, CheckCircle2, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useCreateMyBookingMutation } from '@/entities/booking'
import { useRecordClientExperimentEventMutation } from '@/features/experiments/api/clientExperimentApi'
import type { Cabinet } from '@/entities/cabinet'
import type { Service } from '@/entities/service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ROUTES } from '@/shared/constants/routes'
import { buttonVariants } from '@/components/ui/button-variants'

import {
    createClientBookingSchema,
    type CreateClientBookingFormValues,
} from '../../lib/bookingFormValidation'
import { CreateClientBookingFormActions } from './CreateClientBookingFormActions'
import { CreateClientBookingFormFields } from './CreateClientBookingFormFields'
import { CreateClientBookingFormHeader } from './CreateClientBookingFormHeader'
import { CreateClientBookingUnavailable } from './CreateClientBookingUnavailable'
import {
    createBookingCalendarUrl,
    createCabinetDirectionsUrl,
} from '../../lib/bookingSuccessLinks'

type CreateClientBookingFormProps = {
    cabinetId: string
    cabinet: Pick<Cabinet, 'title' | 'address' | 'city'>
    services: Service[]
    initialServiceId?: string | undefined
    bookingSource?: 'book_again' | undefined
    sourceBookingId?: string | undefined
    discoverySource?: boolean | undefined
}

export function CreateClientBookingForm({
    cabinetId,
    cabinet,
    services,
    initialServiceId,
    bookingSource,
    sourceBookingId,
    discoverySource,
}: CreateClientBookingFormProps) {
    const { t } = useTranslation()
    const [formError, setFormError] = useState<string | null>(null)
    const [submittedBooking, setSubmittedBooking] =
        useState<CreateClientBookingFormValues | null>(null)

    const [createMyBooking, { isLoading }] = useCreateMyBookingMutation()
    const [recordClientEvent] = useRecordClientExperimentEventMutation()
    const bookingStartRecorded = useRef(false)
    const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

    const createClientBookingFormSchema = useMemo(
        () =>
            createClientBookingSchema({
                serviceRequired: t('booking.validation.serviceRequired'),
                dateRequired: t('booking.validation.dateRequired'),
                startTimeRequired: t('booking.validation.startTimeRequired'),
                endTimeRequired: t('booking.validation.endTimeRequired'),
                endTimeAfterStart: t('booking.validation.endTimeAfterStart'),
            }),
        [t],
    )

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateClientBookingFormValues>({
        resolver: zodResolver(createClientBookingFormSchema),
        defaultValues: {
            serviceId: initialServiceId ?? '',
            date: '',
            startTime: '',
            endTime: '',
            comment: '',
        },
    })

    const onSubmit = async (values: CreateClientBookingFormValues) => {
        setFormError(null)

        try {
            const requestKey = idempotencyKey ?? crypto.randomUUID()
            if (!idempotencyKey) {
                setIdempotencyKey(requestKey)
            }

            await createMyBooking({
                cabinetId,
                ...values,
                comment: values.comment || undefined,
                experiment: bookingSource,
                sourceBookingId,
                idempotencyKey: requestKey,
            }).unwrap()

            toast.success(t('booking.bookingCreatedSuccessfully'))

            setSubmittedBooking(values)
            setIdempotencyKey(null)
            reset()
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('booking.failedToCreateBooking'),
            )

            setFormError(message)
            toast.error(message)
        }
    }

    const recordBookingStart = () => {
        if (!discoverySource || bookingStartRecorded.current) return

        bookingStartRecorded.current = true
        void recordClientEvent({ event: 'catalog_search_to_book' }).unwrap().catch(() => undefined)
    }

    const selectedService = submittedBooking
        ? services.find((service) => service.id === submittedBooking.serviceId)
        : undefined
    const successLinkInput = submittedBooking && selectedService
        ? {
            cabinetTitle: cabinet.title,
            address: cabinet.address,
            city: cabinet.city,
            serviceTitle: selectedService.title,
            date: submittedBooking.date,
            startTime: submittedBooking.startTime,
            endTime: submittedBooking.endTime,
        }
        : null
    const calendarUrl = successLinkInput
        ? createBookingCalendarUrl(successLinkInput)
        : null
    const directionsUrl = createCabinetDirectionsUrl(cabinet)

    return (
        <section className="rounded-md border bg-card p-5 shadow-sm sm:p-6">
            {submittedBooking ? (
                <div className="text-center">
                    <CheckCircle2 className="mx-auto size-12 text-status-success-foreground" />
                    <p className="mt-4 text-sm font-medium text-status-success-foreground">
                        {t('booking.successEyebrow')}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                        {t('booking.successTitle')}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        {t('booking.successDescription')}
                    </p>

                    <div className="mx-auto mt-6 max-w-sm rounded-xl border bg-background p-4 text-left">
                        <p className="font-semibold">
                            {selectedService?.title}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {submittedBooking.date} · {submittedBooking.startTime}–{submittedBooking.endTime}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {cabinet.title} · {cabinet.city}, {cabinet.address}
                        </p>
                    </div>

                    <div className="mt-6 grid gap-2">
                        <Link to={ROUTES.profileBookings} className={buttonVariants()}>
                            {t('booking.viewMyBookings')}
                        </Link>
                        {calendarUrl && (
                            <a
                                href={calendarUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={buttonVariants({ variant: 'outline' })}
                            >
                                <CalendarPlus className="size-4" />
                                {t('booking.addToCalendar')}
                            </a>
                        )}
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({ variant: 'outline' })}
                        >
                            <MapPin className="size-4" />
                            {t('booking.openDirections')}
                        </a>
                        <button
                            type="button"
                            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
                            onClick={() => setSubmittedBooking(null)}
                        >
                            {t('booking.bookAnotherTime')}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <CreateClientBookingFormHeader />

                    {services.length === 0 ? (
                        <CreateClientBookingUnavailable />
                    ) : (
                        <form
                            onFocus={recordBookingStart}
                            onSubmit={handleSubmit(onSubmit)}
                            className="mt-6 space-y-6"
                        >
                            <CreateClientBookingFormFields
                                cabinetId={cabinetId}
                                errors={errors}
                                setValue={setValue}
                                watch={watch}
                                register={register}
                                services={services}
                            />

                            <CreateClientBookingFormActions
                                formError={formError}
                                isLoading={isLoading}
                            />
                        </form>
                    )}
                </>
            )}
        </section>
    )
}
