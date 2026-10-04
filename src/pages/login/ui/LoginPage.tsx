import { Link, useLocation } from 'react-router'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { SocialAuthButtons } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { IS_MOCK_API } from '@/shared/config/api'
import { FloatingInput } from '@/components/ui/floating-input'
import { QueryStateCard } from '@/shared/ui/query-state-card'
import { useLogin } from '../lib/useLogin'

// Both build tools inline this setting before resolving the lazy module.
const MockLoginGuidance = process.env.NEXT_PUBLIC_API_MODE === 'real'
    ? () => null
    : lazy(() => import('./MockLoginGuidance'))

export function LoginPage() {
    const location = useLocation()
    const {
        t,
        navigate,
        formError,
        isLoading,
        shouldShowContinueMessage,
        redirectPath,
        form: { register, formState: { errors, isSubmitting } },
        onSubmit
    } = useLogin()
    const formErrorRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        if (formError) {
            formErrorRef.current?.focus()
        }
    }, [formError])

    return (
        <main className="w-full">
            <section className="mx-auto">
                <div className="mb-5">
                    <h1 className=" text-3xl font-semibold tracking-tight">
                        {t('auth.signInTitle')}
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(IS_MOCK_API
                            ? 'auth.signInDescription'
                            : 'auth.signInDescriptionReal')}
                    </p>
                </div>

                {new URLSearchParams(location.search).get('reason') === 'session-expired' && (
                    <QueryStateCard
                        state="session-expired"
                        className="mb-6"
                    />
                )}

                {shouldShowContinueMessage && (
                    <div className="mb-6 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                        {t('auth.signInToContinue')}
                    </div>
                )}

                <form
                    onSubmit={onSubmit}
                    className="rounded-xl border bg-card p-5 shadow-sm sm:p-6"
                >
                    {formError && (
                        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                            <p
                                ref={formErrorRef}
                                id="login-form-error"
                                role="alert"
                                tabIndex={-1}
                                className="text-sm font-medium text-destructive"
                            >
                                {formError}
                            </p>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <FloatingInput
                                id="email"
                                type="email"
                                label={t('auth.email')}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'login-email-error' : undefined}
                                {...register('email')}
                            />

                            {errors.email && (
                                <p id="login-email-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <FloatingInput
                                id="password"
                                type="password"
                                label={t('auth.password')}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'login-password-error' : undefined}
                                {...register('password')}
                            />

                            {errors.password && (
                                <p id="login-password-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.password.message}
                                </p>
                            )}

                            <div className="mt-2 text-right">
                                <Link
                                    to={ROUTES.forgotPassword}
                                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                >
                                    {t('auth.forgotPasswordLink')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" loading={isSubmitting || isLoading} className="mt-6 w-full">
                        {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                    </Button>

                    <div className="mt-6">
                        <SocialAuthButtons
                            redirectPath={redirectPath}
                            onSuccess={(path) => navigate(path, { replace: true })}
                        />
                    </div>

                    <div className="mt-5 flex justify-center text-center">
                        <Link
                            to={ROUTES.register}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                            {t('auth.createAccount')}
                        </Link>
                    </div>
                </form>

                {IS_MOCK_API && <Suspense fallback={null}><MockLoginGuidance /></Suspense>}
            </section>
        </main>
    )
}
