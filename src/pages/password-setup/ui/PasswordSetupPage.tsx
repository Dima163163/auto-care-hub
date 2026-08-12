import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'
import { usePasswordSetup } from '../lib/usePasswordSetup'
import { PasswordSetupInvalid, PasswordSetupVerifying } from './PasswordSetupStates'

export function PasswordSetupPage() {
    const { t } = useTranslation()
    const {
        tokenDetails,
        isCheckingToken,
        verificationError,
        isCompleting,
        formError,
        form: { register, formState: { errors, isSubmitting } },
        onSubmit,
    } = usePasswordSetup()

    if (isCheckingToken) {
        return <PasswordSetupVerifying />
    }

    if (verificationError || !tokenDetails) {
        return <PasswordSetupInvalid error={verificationError} />
    }

    return (
        <section>
            <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {tokenDetails.email}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {t('auth.passwordSetupTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.passwordSetupDescription')}
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
                        <label htmlFor="password" className="text-sm font-medium">
                            {t('auth.newPassword')}
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={
                                errors.password ? 'password-error' : undefined
                            }
                            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                            {...register('password')}
                        />
                        {errors.password && (
                            <p
                                id="password-error"
                                className="mt-2 text-sm text-destructive"
                            >
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="text-sm font-medium"
                        >
                            {t('auth.confirmPassword')}
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={
                                errors.confirmPassword
                                    ? 'confirm-password-error'
                                    : undefined
                            }
                            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p
                                id="confirm-password-error"
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
                        ? t('auth.passwordSetupSaving')
                        : t('auth.passwordSetupSubmit')}
                </Button>
            </form>
        </section>
    )
}
