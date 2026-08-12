import type {
    FieldErrors,
    UseFormRegister,
} from 'react-hook-form'

import { CabinetImageField } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { OwnerCabinetCreateFormValues } from '../lib/ownerCabinetCreateSchema'
import { OwnerCabinetCreateField } from './OwnerCabinetCreateField'

type OwnerCabinetCreateFormFieldsProps = {
    errors: FieldErrors<OwnerCabinetCreateFormValues>
    imageError: string | null
    imageUrl?: string | null | undefined
    onImageChange: (file?: File | undefined) => void
    register: UseFormRegister<OwnerCabinetCreateFormValues>
}

export function OwnerCabinetCreateFormFields({
    errors,
    imageError,
    imageUrl,
    onImageChange,
    register,
}: OwnerCabinetCreateFormFieldsProps) {
    const { t } = useTranslation()

    return (
        <div className="space-y-5">
            <OwnerCabinetCreateField
                error={errors.title?.message}
                htmlFor="title"
                label={t('cabinet.form.titleLabel')}
            >
                <input
                    id="title"
                    type="text"
                    placeholder={t('cabinet.form.titlePlaceholder')}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('title')}
                />
            </OwnerCabinetCreateField>

            <OwnerCabinetCreateField
                error={errors.description?.message}
                htmlFor="description"
                label={t('cabinet.form.descriptionLabel')}
            >
                <textarea
                    id="description"
                    rows={5}
                    placeholder={t('cabinet.form.descriptionPlaceholder')}
                    className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('description')}
                />
            </OwnerCabinetCreateField>

            <div className="grid gap-5 sm:grid-cols-2">
                <OwnerCabinetCreateField
                    error={errors.city?.message}
                    htmlFor="city"
                    label={t('cabinet.form.cityLabel')}
                >
                    <input
                        id="city"
                        type="text"
                        placeholder={t('cabinet.form.cityPlaceholder')}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                        {...register('city')}
                    />
                </OwnerCabinetCreateField>

                <OwnerCabinetCreateField
                    error={errors.pricePerHour?.message}
                    htmlFor="pricePerHour"
                    label={t('cabinet.form.pricePerHourRubLabel')}
                >
                    <input
                        id="pricePerHour"
                        type="number"
                        min={0}
                        step={1}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                        {...register('pricePerHour', { valueAsNumber: true })}
                    />
                </OwnerCabinetCreateField>
            </div>

            <OwnerCabinetCreateField
                error={errors.address?.message}
                htmlFor="address"
                label={t('cabinet.form.addressLabel')}
            >
                <input
                    id="address"
                    type="text"
                    placeholder={t('cabinet.form.addressPlaceholder')}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('address')}
                />
            </OwnerCabinetCreateField>

            <CabinetImageField
                error={imageError}
                hint={t('cabinet.imageHint')}
                imageUrl={imageUrl}
                label={t('cabinet.image')}
                onChange={onImageChange}
            />
        </div>
    )
}
