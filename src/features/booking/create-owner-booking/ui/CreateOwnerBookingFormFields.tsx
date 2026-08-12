import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form'

import type { Cabinet } from '@/entities/cabinet'
import type { Service } from '@/entities/service'
import type { OwnerClient } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { CreateOwnerBookingFormValues } from '../../lib/bookingFormValidation'
import { OwnerBookingField } from './OwnerBookingField'
import { OwnerBookingScheduleFields } from './OwnerBookingScheduleFields'
import { OwnerBookingServiceField } from './OwnerBookingServiceField'

type CreateOwnerBookingFormFieldsProps = {
    availableServices: Service[]
    cabinets: Cabinet[]
    clients: OwnerClient[]
    errors: FieldErrors<CreateOwnerBookingFormValues>
    setValue: UseFormSetValue<CreateOwnerBookingFormValues>
    watch: UseFormWatch<CreateOwnerBookingFormValues>
    isCabinetsLoading: boolean
    isClientsLoading: boolean
    isServicesLoading: boolean
    register: UseFormRegister<CreateOwnerBookingFormValues>
    selectedCabinetId: string
    serviceDescriptionId?: string | undefined
}

export function CreateOwnerBookingFormFields({
    availableServices,
    cabinets,
    clients,
    errors,
    setValue,
    watch,
    isCabinetsLoading,
    isClientsLoading,
    isServicesLoading,
    register,
    selectedCabinetId,
    serviceDescriptionId,
}: CreateOwnerBookingFormFieldsProps) {
    const { t } = useTranslation()

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <OwnerBookingField
                error={errors.clientId?.message}
                errorId="clientId-error"
                htmlFor="clientId"
                label={t('user.client')}
            >
                <select
                    id="clientId"
                    disabled={isClientsLoading || clients.length === 0}
                    aria-invalid={Boolean(errors.clientId)}
                    aria-describedby={
                        errors.clientId ? 'clientId-error' : undefined
                    }
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    {...register('clientId')}
                >
                    <option value="">{t('booking.selectClient')}</option>

                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.name}
                        </option>
                    ))}
                </select>
            </OwnerBookingField>

            <OwnerBookingField
                error={errors.cabinetId?.message}
                errorId="cabinetId-error"
                htmlFor="cabinetId"
                label={t('cabinet.title')}
            >
                <select
                    id="cabinetId"
                    disabled={isCabinetsLoading || cabinets.length === 0}
                    aria-invalid={Boolean(errors.cabinetId)}
                    aria-describedby={
                        errors.cabinetId ? 'cabinetId-error' : undefined
                    }
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    {...register('cabinetId')}
                >
                    <option value="">{t('booking.selectCabinet')}</option>

                    {cabinets.map((cabinet) => (
                        <option key={cabinet.id} value={cabinet.id}>
                            {cabinet.title}
                        </option>
                    ))}
                </select>
            </OwnerBookingField>

            <OwnerBookingServiceField
                availableServices={availableServices}
                error={errors.serviceId}
                isServicesLoading={isServicesLoading}
                register={register}
                selectedCabinetId={selectedCabinetId}
                serviceDescriptionId={serviceDescriptionId}
            />

            <OwnerBookingScheduleFields
                cabinetId={selectedCabinetId}
                errors={errors}
                setValue={setValue}
                watch={watch}
                register={register}
                availableServices={availableServices}
            />
        </div>
    )
}
