import { useEffect, useState } from 'react'
import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import type { Service } from '@/entities/service'
import { useUpdateServiceMutation } from '@/entities/service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { I18nContextValue } from '@/shared/lib/i18n-context'
import { useTranslation } from '@/shared/lib/useTranslation'

function createUpdateServiceSchema(t: I18nContextValue['t']) {
    return z.object({
        title: z
            .string()
            .min(3, t('service.validation.titleMin', { count: 3 })),
        description: z.string().optional(),
        durationMinutes: z
            .number()
            .int(t('service.validation.durationInteger'))
            .min(15, t('service.validation.durationMin', { count: 15 })),
        price: z
            .number()
            .int(t('service.validation.priceInteger'))
            .min(0, t('service.validation.priceMin')),
    })
}

type UpdateServiceFormValues = z.infer<ReturnType<typeof createUpdateServiceSchema>>

type UpdateServiceFormProps = {
    service: Service
    onCancel: () => void
    onSuccess: () => void
}

export function UpdateServiceForm({
  service,
  onCancel,
  onSuccess,
}: UpdateServiceFormProps) {
    const { t } = useTranslation()
    const [formError, setFormError] = useState<string | null>(null)

    const [updateService, { isLoading }] = useUpdateServiceMutation()
    const schema = useMemo(() => createUpdateServiceSchema(t), [t])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UpdateServiceFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: service.title,
            description: service.description ?? '',
            durationMinutes: service.durationMinutes,
            price: service.price,
        },
    })

    useEffect(() => {
        reset({
            title: service.title,
            description: service.description ?? '',
            durationMinutes: service.durationMinutes,
            price: service.price,
        })
    }, [service, reset])

    const onSubmit = async (values: UpdateServiceFormValues) => {
        setFormError(null)

        try {
            await updateService({
                id: service.id,
                cabinetId: service.cabinetId,
                title: values.title,
                description: values.description || undefined,
                durationMinutes: values.durationMinutes,
                price: values.price,
            }).unwrap()

            toast.success(t('service.form.updatedSuccessfully'))
            onSuccess()
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('service.form.updatedFailed'),
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-4 rounded-xl border bg-muted/30 p-4"
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor={`service-title-${service.id}`} className="text-sm font-medium">
                        {t('service.form.titleLabel')}
                    </label>

                    <input
                        id={`service-title-${service.id}`}
                        type="text"
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('title')}
                    />

                    {errors.title && (
                        <p className="mt-2 text-sm text-destructive">
                            {errors.title.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor={`service-description-${service.id}`} className="text-sm font-medium">
                        {t('service.form.descriptionLabel')}
                    </label>

                    <textarea
                        id={`service-description-${service.id}`}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('description')}
                    />

                    {errors.description && (
                        <p className="mt-2 text-sm text-destructive">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`service-duration-${service.id}`} className="text-sm font-medium">
                            {t('service.form.durationLabel')}
                        </label>

                        <input
                            id={`service-duration-${service.id}`}
                            type="number"
                            min={15}
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
                        <label htmlFor={`service-price-${service.id}`} className="text-sm font-medium">
                            {t('service.form.priceLabel')}
                        </label>

                        <input
                            id={`service-price-${service.id}`}
                            type="number"
                            min={0}
                            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                            {...register('price', { valueAsNumber: true })}
                        />

                        {errors.price && (
                            <p className="mt-2 text-sm text-destructive">
                                {errors.price.message}
                            </p>
                        )}
                    </div>
                </div>

                {formError && (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formError}
                    </p>
                )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                <Button
                    type="submit"
                    loading={isSubmitting || isLoading}
                >
                    {isLoading
                        ? t('service.form.savingAction')
                        : t('service.form.saveAction')}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || isLoading}
                    onClick={onCancel}
                >
                    {t('common.cancel')}
                </Button>
            </div>
        </form>
    )
}
