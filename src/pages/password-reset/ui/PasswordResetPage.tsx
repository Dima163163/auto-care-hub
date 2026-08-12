import { Button } from '@/components/ui/button'
import { usePasswordReset } from '../lib/usePasswordReset'
import { PasswordResetInvalid, PasswordResetVerifying } from './PasswordResetStates'

export function PasswordResetPage() {
    const {
        t,
        tokenDetails,
        isCheckingToken,
        verificationError,
        isCompleting,
        formError,
        form: { register, formState: { errors, isSubmitting } },
        onSubmit,
    } = usePasswordReset()

    if (isCheckingToken) {
        return <PasswordResetVerifying />
    }

    if (verificationError || !tokenDetails) {
        return <PasswordResetInvalid error={verificationError} />
    }

    return (
        <section>
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {tokenDetails.email}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {t('auth.passwordResetTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.passwordResetDescription')}
                </p>
            </div>

            <form
                onSubmit={onSubmit}
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

                <div className="space-y-5">
                    <div>
                        <label htmlFor="new-password" className="text-sm font-medium">
                            {t('auth.newPassword')}
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={
                                errors.password
                                    ? 'new-password-error'
                                    : undefined
                            }
                            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                            {...register('password')}
                        />
                        {errors.password && (
                            <p
                                id="new-password-error"
                                className="mt-2 text-sm text-destructive"
                            >
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="reset-confirm-password"
                            className="text-sm font-medium"
                        >
                            {t('auth.confirmPassword')}
                        </label>
                        <input
                            id="reset-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={
                                errors.confirmPassword
                                    ? 'reset-confirm-password-error'
                                    : undefined
                            }
                            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p
                                id="reset-confirm-password-error"
                                className="mt-2 text-sm text-destructive"
                            >
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>
                </div>

                <Button
                    type="submit"
                    loading={isSubmitting || isCompleting}
                    className="mt-6 w-full"
                >
                    {isCompleting
                        ? t('auth.passwordResetSaving')
                        : t('auth.passwordResetSubmit')}
                </Button>
            </form>
        </section>
    )
}
