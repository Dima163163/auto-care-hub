import { Link } from 'react-router'
import { useEffect, useRef } from 'react'
import { SocialAuthButtons } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { FloatingInput } from '@/components/ui/floating-input'
import { IS_MOCK_API } from '@/shared/config/api'
import { useRegister } from '../lib/useRegister'

export function RegisterPage() {
    const {
        t,
        navigate,
        formError,
        isLoading,
        form: { register, formState: { errors, isSubmitting } },
        onSubmit
    } = useRegister()
    const formErrorRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        if (formError) {
            formErrorRef.current?.focus()
        }
    }, [formError])

    return (
        <main className="w-full">
            <section className="mx-auto">
                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                        {t('auth.createAccount')}
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        {t('auth.joinTitle')}
                    </h1>

                    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(IS_MOCK_API
                            ? 'auth.joinDescription'
                            : 'auth.joinDescriptionReal')}
                    </p>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="rounded-xl border bg-card p-6 shadow-sm"
                >
                    {formError && (
                        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                            <p
                                ref={formErrorRef}
                                id="register-form-error"
                                role="alert"
                                tabIndex={-1}
                                className="text-sm font-medium text-destructive"
                            >
                                {formError}
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <FloatingInput
                                id="name"
                                type="text"
                                label={t('auth.name')}
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'register-name-error' : undefined}
                                {...register("name")}
                            />

                            {errors.name && (
                                <p id="register-name-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <FloatingInput
                                id="email"
                                type="email"
                                label={t('auth.email')}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'register-email-error' : undefined}
                                {...register("email")}
                            />

                            {errors.email && (
                                <p id="register-email-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="role" className="text-sm font-medium mb-1 inline-block text-muted-foreground ml-1">
                                {t('auth.accountType')}
                            </label>

                            <select
                                id="role"
                                aria-invalid={Boolean(errors.role)}
                                aria-describedby={errors.role ? 'register-role-error' : undefined}
                                className="w-full h-14 rounded-[1.25rem] border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
                                {...register("role")}
                            >
                                <option value="client">{t('user.client')}</option>
                                <option value="owner">{t('user.owner')}</option>
                            </select>

                            {errors.role && (
                                <p id="register-role-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.role.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <FloatingInput
                                id="password"
                                type="password"
                                label={t('auth.password')}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'register-password-error' : undefined}
                                {...register("password")}
                            />

                            {errors.password && (
                                <p id="register-password-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <FloatingInput
                                id="confirmPassword"
                                type="password"
                                label={t('auth.confirmPassword')}
                                aria-invalid={Boolean(errors.confirmPassword)}
                                aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                                {...register('confirmPassword')}
                            />

                            {errors.confirmPassword && (
                                <p id="register-confirm-password-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        loading={isSubmitting || isLoading}
                        className="mt-6 w-full"
                    >
                        {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                    </Button>

                    <div className="mt-6">
                        <SocialAuthButtons
                            onSuccess={(path) => navigate(path, { replace: true })}
                        />
                    </div>

                    <div className="mt-5 flex justify-center">
                        <Link
                            to={ROUTES.login}
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                            {t('auth.alreadyHaveAccount')}
                        </Link>
                    </div>
                </form>
            </section>
        </main>
    )
}
