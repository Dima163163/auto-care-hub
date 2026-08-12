import type {
    FieldErrors,
    UseFormRegister,
} from 'react-hook-form'

import { CabinetImageField } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { OwnerCabinetEditFormValues } from '../lib/ownerCabinetEditSchema'
import { OwnerCabinetEditField } from './OwnerCabinetEditField'

type OwnerCabinetEditFormFieldsProps = {
    errors: FieldErrors<OwnerCabinetEditFormValues>
    imageError: string | null
    imageUrl?: string | null | undefined
    onImageChange: (file?: File | undefined) => void
    register: UseFormRegister<OwnerCabinetEditFormValues>
}

export function OwnerCabinetEditFormFields({
    errors,
    imageError,
    imageUrl,
    onImageChange,
    register,
}: OwnerCabinetEditFormFieldsProps) {
    const { t } = useTranslation()

    return (
        <div className="space-y-5">
            <OwnerCabinetEditField
                error={errors.title?.message}
                htmlFor="title"
                label={t('cabinet.form.titleLabel')}
            >
                <input
                    id="title"
                    type="text"
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('title')}
                />
            </OwnerCabinetEditField>

            <OwnerCabinetEditField
                error={errors.description?.message}
                htmlFor="description"
                label={t('cabinet.form.descriptionLabel')}
            >
                <textarea
                    id="description"
                    rows={5}
                    className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('description')}
                />
            </OwnerCabinetEditField>

            <div className="grid gap-5 sm:grid-cols-2">
                <OwnerCabinetEditField
                    error={errors.city?.message}
                    htmlFor="city"
                    label={t('cabinet.form.cityLabel')}
                >
                    <input
                        id="city"
                        type="text"
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('city')}
                    />
                </OwnerCabinetEditField>

                <OwnerCabinetEditField
                    error={errors.pricePerHour?.message}
                    htmlFor="pricePerHour"
                    label={t('cabinet.form.pricePerHourLabel')}
                >
                    <input
                        id="pricePerHour"
                        type="number"
                        min={0}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('pricePerHour', { valueAsNumber: true })}
                    />
                </OwnerCabinetEditField>
            </div>

            <OwnerCabinetEditField
                error={errors.address?.message}
                htmlFor="address"
                label={t('cabinet.form.addressLabel')}
            >
                <input
                    id="address"
                    type="text"
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('address')}
                />
            </OwnerCabinetEditField>

            <CabinetImageField
                error={imageError}
                hint={t('cabinet.imageHint')}
                imageUrl={imageUrl}
                label={t('cabinet.image')}
                onChange={onImageChange}
            />

            <OwnerCabinetEditField error={errors.timezone?.message} htmlFor="timezone" label={t('cabinet.form.timezoneLabel')}>
                <select id="timezone" className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm" {...register('timezone')}>
                    {['UTC', 'Europe/Chisinau', 'Europe/Bucharest', 'Europe/London', 'Europe/Moscow'].map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
                </select>
            </OwnerCabinetEditField>

            <OwnerCabinetEditField error={errors.amenities?.message} htmlFor="amenities" label={t('cabinet.form.amenitiesLabel')}>
                <input id="amenities" type="text" className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder={t('cabinet.form.amenitiesPlaceholder')} {...register('amenities')} />
            </OwnerCabinetEditField>

            <OwnerCabinetEditField error={errors.cancellationPolicy?.message} htmlFor="cancellationPolicy" label={t('cabinet.form.cancellationPolicyLabel')}>
                <textarea id="cancellationPolicy" rows={3} className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm" {...register('cancellationPolicy')} />
            </OwnerCabinetEditField>

            <OwnerCabinetEditField error={errors.houseRules?.message} htmlFor="houseRules" label={t('cabinet.form.houseRulesLabel')}>
                <textarea id="houseRules" rows={3} className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm" {...register('houseRules')} />
            </OwnerCabinetEditField>
        </div>
    )
}
