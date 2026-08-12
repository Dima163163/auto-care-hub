import type { FieldError, UseFormRegister } from 'react-hook-form'

import type { Service } from '@/entities/service'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { CreateOwnerBookingFormValues } from '../../lib/bookingFormValidation'
import { OwnerBookingField } from './OwnerBookingField'

type OwnerBookingServiceFieldProps = {
    availableServices: Service[]
    error?: FieldError | undefined
    isServicesLoading: boolean
    register: UseFormRegister<CreateOwnerBookingFormValues>
    selectedCabinetId: string
    serviceDescriptionId?: string | undefined
}

export function OwnerBookingServiceField({
    availableServices,
    error,
    isServicesLoading,
    register,
    selectedCabinetId,
    serviceDescriptionId,
}: OwnerBookingServiceFieldProps) {
    const { t } = useTranslation()

    return (
        <OwnerBookingField
            error={error?.message}
            errorId="serviceId-error"
            htmlFor="serviceId"
            label={t('service.title')}
        >
            <select
                id="serviceId"
                disabled={
                    isServicesLoading ||
                    !selectedCabinetId ||
                    availableServices.length === 0
                }
                aria-invalid={Boolean(error)}
                aria-describedby={serviceDescriptionId}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                {...register('serviceId')}
            >
                <option value="">{t('booking.selectService')}</option>

                {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                        {service.title}
                    </option>
                ))}
            </select>

            {!selectedCabinetId && (
                <p id="serviceId-hint" className="mt-2 text-sm text-muted-foreground">
                    {t('booking.selectCabinetToSeeServices')}
                </p>
            )}

            {selectedCabinetId && availableServices.length === 0 && (
                <p id="serviceId-hint" className="mt-2 text-sm text-muted-foreground">
                    {t('booking.noActiveServicesForCabinet')}
                </p>
            )}
        </OwnerBookingField>
    )
}
