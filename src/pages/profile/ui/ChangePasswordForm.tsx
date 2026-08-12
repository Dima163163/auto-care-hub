import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { useChangePasswordMutation } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey, TranslationParams } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

const createChangePasswordSchema = (t: (key: TranslationKey, params?: TranslationParams) => string) =>
    z
        .object({
            oldPassword: z.string().min(1, t('auth.validation.passwordRequired')),
            newPassword: z
                .string()
            .min(8, t('auth.validation.passwordMin', { count: 8 })),
            confirmPassword: z
                .string()
                .min(1, t('auth.validation.confirmPasswordRequired')),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t('auth.validation.passwordsMustMatch'),
            path: ['confirmPassword'],
        })

type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>

export function ChangePasswordForm() {
    const { t } = useTranslation()
    const [formError, setFormError] = useState<string | null>(null)
    const [changePassword, { isLoading }] = useChangePasswordMutation()
    
    const schema = createChangePasswordSchema(t)
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const onSubmit = async (values: ChangePasswordFormValues) => {
        setFormError(null)

        try {
            await changePassword({
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
            }).unwrap()

            toast.success(t('auth.changePasswordSuccess'))
            reset()
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.changePasswordFailed')
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
                {t('auth.changePasswordTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                {t('auth.changePasswordDescription')}
            </p>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
            >
                {formError && (
                    <div
                        className="rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                        role="alert"
                    >
                        <p className="text-sm font-medium text-destructive">
                            {formError}
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="old-password" className="text-sm font-medium">
                        {t('auth.currentPassword')}
                    </label>
                    <input
                        id="old-password"
                        type="password"
                        autoComplete="current-password"
                        aria-invalid={Boolean(errors.oldPassword)}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('oldPassword')}
                    />
                    {errors.oldPassword && (
                        <p className="mt-2 text-sm text-destructive">
                            {errors.oldPassword.message}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="new-password" className="text-sm font-medium">
                        {t('auth.newPassword')}
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.newPassword)}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('newPassword')}
                    />
                    {errors.newPassword && (
                        <p className="mt-2 text-sm text-destructive">
                            {errors.newPassword.message}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="confirm-password"
                        className="text-sm font-medium"
                    >
                        {t('auth.confirmPassword')}
                    </label>
                    <input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                        {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-destructive">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    loading={isSubmitting || isLoading}
                    className="mt-2 w-full sm:w-auto"
                >
                    {isLoading
                        ? t('auth.changePasswordSaving')
                        : t('auth.changePasswordSubmit')}
                </Button>
            </form>
        </section>
    )
}
