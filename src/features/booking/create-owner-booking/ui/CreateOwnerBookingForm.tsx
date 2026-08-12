import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useCreateBookingMutation } from '@/entities/booking'
import type { Cabinet } from '@/entities/cabinet'
import type { Service } from '@/entities/service'
import type { OwnerClient } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    createOwnerBookingSchema,
    type CreateOwnerBookingFormValues,
} from '../../lib/bookingFormValidation'
import { useOwnerBookingServices } from '../lib/useOwnerBookingServices'
import { CreateOwnerBookingFormActions } from './CreateOwnerBookingFormActions'
import { CreateOwnerBookingFormFields } from './CreateOwnerBookingFormFields'
import { CreateOwnerBookingFormHeader } from './CreateOwnerBookingFormHeader'

type CreateOwnerBookingFormProps = {
    clients: OwnerClient[]
    cabinets: Cabinet[]
    services: Service[]
    isClientsLoading: boolean
    isCabinetsLoading: boolean
    isServicesLoading: boolean
}

export function CreateOwnerBookingForm({
    clients,
    cabinets,
    services,
    isClientsLoading,
    isCabinetsLoading,
    isServicesLoading,
}: CreateOwnerBookingFormProps) {
    const { t } = useTranslation()
    const [formError, setFormError] = useState<string | null>(null)

    const [createBooking, { isLoading: isCreatingBooking }] =
        useCreateBookingMutation()

    const createOwnerBookingFormSchema = useMemo(
        () =>
            createOwnerBookingSchema({
                clientRequired: t('booking.validation.clientRequired'),
                cabinetRequired: t('booking.validation.cabinetRequired'),
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
        control,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateOwnerBookingFormValues>({
        resolver: zodResolver(createOwnerBookingFormSchema),
        defaultValues: {
            clientId: '',
            cabinetId: '',
            serviceId: '',
            date: '',
            startTime: '',
            endTime: '',
            comment: '',
        },
    })

    const { availableServices, selectedCabinetId, serviceDescriptionId } =
        useOwnerBookingServices({
        control,
        errors,
        services,
        setValue,
    })
    const isSubmitDisabled =
        isSubmitting ||
        isCreatingBooking ||
        clients.length === 0 ||
        cabinets.length === 0

    const onSubmit = async (values: CreateOwnerBookingFormValues) => {
        try {
            setFormError(null)

            await createBooking({
                ...values,
                comment: values.comment || undefined,
            }).unwrap()

            toast.success(t('booking.bookingCreatedSuccessfully'))

            reset({
                clientId: '',
                cabinetId: '',
                serviceId: '',
                date: '',
                startTime: '',
                endTime: '',
                comment: '',
            })
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('booking.failedToCreateBooking'),
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="mb-8 rounded-xl border bg-card p-6 shadow-sm"
        >
            <CreateOwnerBookingFormHeader formError={formError} />

            <CreateOwnerBookingFormFields
                availableServices={availableServices}
                cabinets={cabinets}
                clients={clients}
                errors={errors}
                setValue={setValue}
                watch={watch}
                isCabinetsLoading={isCabinetsLoading}
                isClientsLoading={isClientsLoading}
                isServicesLoading={isServicesLoading}
                register={register}
                selectedCabinetId={selectedCabinetId}
                serviceDescriptionId={serviceDescriptionId}
            />

            <CreateOwnerBookingFormActions
                isCreatingBooking={isCreatingBooking}
                isSubmitDisabled={isSubmitDisabled}
            />
        </form>
    )
}
