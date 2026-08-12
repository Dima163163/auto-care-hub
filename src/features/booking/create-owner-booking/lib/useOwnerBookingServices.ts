import { useEffect } from 'react'
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form'
import { useWatch } from 'react-hook-form'

import type { Service } from '@/entities/service'

import type { CreateOwnerBookingFormValues } from '../../lib/bookingFormValidation'

type UseOwnerBookingServicesParams = {
    control: Control<CreateOwnerBookingFormValues>
    errors: FieldErrors<CreateOwnerBookingFormValues>
    services: Service[]
    setValue: UseFormSetValue<CreateOwnerBookingFormValues>
}

export function useOwnerBookingServices({
    control,
    errors,
    services,
    setValue,
}: UseOwnerBookingServicesParams) {
    const selectedCabinetId = useWatch({
        control,
        name: 'cabinetId',
        defaultValue: '',
    })

    useEffect(() => {
        setValue('serviceId', '')
    }, [selectedCabinetId, setValue])

    const availableServices = services.filter(
        (service) =>
            service.cabinetId === selectedCabinetId && service.isActive,
    )
    const serviceHintId =
        !selectedCabinetId || availableServices.length === 0
            ? 'serviceId-hint'
            : undefined
    const serviceDescriptionId = errors.serviceId
        ? 'serviceId-error'
        : serviceHintId

    return {
        availableServices,
        selectedCabinetId,
        serviceDescriptionId,
    }
}
