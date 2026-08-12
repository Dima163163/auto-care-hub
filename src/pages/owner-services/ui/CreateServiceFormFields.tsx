import type {
    FieldErrors,
    UseFormRegister,
} from 'react-hook-form'

import type { Cabinet } from '@/entities/cabinet'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { CreateServiceFormValues } from '../lib/createServiceSchema'

type CreateServiceFormFieldsProps = {
    cabinets: Cabinet[]
    errors: FieldErrors<CreateServiceFormValues>
    isCabinetsLoading: boolean
    register: UseFormRegister<CreateServiceFormValues>
}

export function CreateServiceFormFields({
    cabinets,
    errors,
    isCabinetsLoading,
    register,
}: CreateServiceFormFieldsProps) {
    const { t } = useTranslation()

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <div>
                <label htmlFor="cabinetId" className="text-sm font-medium">
                    {t('cabinet.title')}
                </label>

                <select
                    id="cabinetId"
                    disabled={isCabinetsLoading || cabinets.length === 0}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    {...register('cabinetId')}
                >
                    <option value="">
                        {t('service.form.selectCabinet')}
                    </option>

                    {cabinets.map((cabinet) => (
                        <option key={cabinet.id} value={cabinet.id}>
                            {cabinet.title}
                        </option>
                    ))}
                </select>

                {errors.cabinetId && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.cabinetId.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="title" className="text-sm font-medium">
                    {t('service.form.titleLabel')}
                </label>

                <input
                    id="title"
                    type="text"
                    placeholder={t('service.form.titlePlaceholder')}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('title')}
                />

                {errors.title && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.title.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="durationMinutes" className="text-sm font-medium">
                    {t('service.form.durationLabel')}
                </label>

                <input
                    id="durationMinutes"
                    type="number"
                    min={15}
                    step={15}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('durationMinutes', { valueAsNumber: true })}
                />

                {errors.durationMinutes && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.durationMinutes.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="price" className="text-sm font-medium">
                    {t('service.form.priceLabel')}
                </label>

                <input
                    id="price"
                    type="number"
                    min={0}
                    step={1}
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('price', { valueAsNumber: true })}
                />

                {errors.price && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.price.message}
                    </p>
                )}
            </div>

            <div className="lg:col-span-2">
                <label htmlFor="description" className="text-sm font-medium">
                    {t('service.form.descriptionLabel')}
                </label>

                <textarea
                    id="description"
                    rows={4}
                    placeholder={t('service.form.descriptionPlaceholder')}
                    className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                    {...register('description')}
                />

                {errors.description && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.description.message}
                    </p>
                )}
            </div>

            <label className="flex items-center gap-3 text-sm font-medium">
                <input
                    type="checkbox"
                    className="size-4 rounded border"
                    {...register('isActive')}
                />

                {t('service.form.activeLabel')}
            </label>
        </div>
    )
}
