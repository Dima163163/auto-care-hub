import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import type { Cabinet } from '@/entities/cabinet'
import { useCreateServiceMutation } from '@/entities/service'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    createServiceSchema,
    type CreateServiceFormValues,
} from '../lib/createServiceSchema'
import { CreateServiceFormFields } from './CreateServiceFormFields'

const defaultValues: CreateServiceFormValues = {
    cabinetId: '',
    title: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    isActive: true,
}

type CreateServiceFormProps = {
    cabinets: Cabinet[]
    isCabinetsLoading: boolean
}

export function CreateServiceForm({
    cabinets,
    isCabinetsLoading,
}: CreateServiceFormProps) {
    const { t } = useTranslation()
    const [formError, setFormError] = useState<string | null>(null)
    const [createService, { isLoading: isCreating }] = useCreateServiceMutation()
    const schema = useMemo(() => createServiceSchema(t), [t])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateServiceFormValues>({
        resolver: zodResolver(schema),
        defaultValues,
    })

    const onSubmit = async (values: CreateServiceFormValues) => {
        try {
            setFormError(null)

            await createService({
                ...values,
                description: values.description || undefined,
            }).unwrap()

            reset(defaultValues)
        } catch {
            setFormError(t('service.form.createdFailed'))
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="mb-8 rounded-xl border bg-card p-6 shadow-sm"
        >
            <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight">
                    {t('service.form.createTitle')}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t('service.form.createDescription')}
                </p>
            </div>

            {formError && (
                <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">
                        {formError}
                    </p>
                </div>
            )}

            <CreateServiceFormFields
                cabinets={cabinets}
                errors={errors}
                isCabinetsLoading={isCabinetsLoading}
                register={register}
            />

            <div className="mt-6 flex justify-end">
                <Button
                    type="submit"
                    loading={isSubmitting || isCreating}
                    disabled={cabinets.length === 0}
                >
                    {isCreating
                        ? t('service.form.creatingAction')
                        : t('service.form.createAction')}
                </Button>
            </div>
        </form>
    )
}
