import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useRequestPasswordResetMutation } from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    createForgotPasswordSchema,
    type ForgotPasswordFormValues,
} from '../lib/forgotPasswordSchema'

export function ForgotPasswordPage() {
    const { t } = useTranslation()
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [requestPasswordReset, { isLoading }] =
        useRequestPasswordResetMutation()
    const schema = useMemo(() => createForgotPasswordSchema(t), [t])
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
        },
    })

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        setFormError(null)

        try {
            await requestPasswordReset(values).unwrap()
            setIsSubmitted(true)
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.passwordResetRequestFailed')
            )

            setFormError(message)
            toast.error(message)
        }
    }

    if (isSubmitted) {
        return (
            <section
                className="rounded-xl border bg-card p-6 text-center shadow-sm"
                aria-live="polite"
            >
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t('auth.passwordResetEmailSentTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.passwordResetEmailSentDescription')}
                </p>
                <Link
                    to={ROUTES.login}
                    className={buttonVariants({
                        className: 'mt-6',
                    })}
                >
                    {t('auth.goToSignIn')}
                </Link>
            </section>
        )
    }

    return (
        <section>
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {t('auth.passwordResetRequestSubmit')}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    {t('auth.forgotPasswordTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.forgotPasswordDescription')}
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="rounded-xl border bg-card p-6 shadow-sm"
            >
                {formError && (
                    <div
                        className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                        role="alert"
                    >
                        <p className="text-sm font-medium text-destructive">
                            {formError}
                        </p>
                    </div>
                )}

                <label htmlFor="reset-email" className="text-sm font-medium">
                    {t('auth.email')}
                </label>
                <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                        errors.email ? 'reset-email-error' : undefined
                    }
                    className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                    {...register('email')}
                />
                {errors.email && (
                    <p
                        id="reset-email-error"
                        className="mt-2 text-sm text-destructive"
                    >
                        {errors.email.message}
                    </p>
                )}

                <Button
                    type="submit"
                    loading={isSubmitting || isLoading}
                    className="mt-6 w-full"
                >
                    {isLoading
                        ? t('auth.passwordResetRequestSending')
                        : t('auth.passwordResetRequestSubmit')}
                </Button>

                <div className="mt-5 flex justify-center">
                    <Link
                        to={ROUTES.login}
                        className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                        })}
                    >
                        {t('auth.goToSignIn')}
                    </Link>
                </div>
            </form>
        </section>
    )
}
