import { CarFront, Store } from 'lucide-react'
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
        form: { register, watch, formState: { errors, isSubmitting } },
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
                <div className="mb-5">
                    <h1 className=" text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
                        {t('auth.joinTitle')}
                    </h1>

                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(IS_MOCK_API ? 'auth.joinDescription' : 'auth.joinDescriptionReal')}
                    </p>
                </div>

                <form onSubmit={onSubmit} className="rounded-[var(--radius-panel)] border border-border/80 bg-card/95 p-5 shadow-sm sm:p-6">
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

                    <div className="space-y-5">
                        <fieldset>
                            <legend className="text-sm font-semibold text-foreground">{t('auth.accountType')}</legend>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="group relative cursor-pointer">
                                    <input type="radio" value="client" className="peer sr-only" {...register('role')} />
                                    <span className="block rounded-[var(--radius-card)] border border-border bg-background p-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:shadow-[0_0_0_3px_hsl(var(--primary)/.1)] group-hover:border-primary/50">
                                        <span className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><CarFront className="size-4" /></span>
                                            <span><span className="block text-sm font-black">{t('auth.clientRoleTitle')}</span><span className="sr-only">{t('auth.clientRoleDescription')}</span></span>
                                        </span>
                                    </span>
                                </label>
                                <label className="group relative cursor-pointer">
                                    <input type="radio" value="owner" className="peer sr-only" {...register('role')} />
                                    <span className="block rounded-[var(--radius-card)] border border-border bg-background p-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:shadow-[0_0_0_3px_hsl(var(--primary)/.1)] group-hover:border-primary/50">
                                        <span className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Store className="size-4" /></span>
                                            <span><span className="block text-sm font-black">{t('auth.ownerRoleTitle')}</span><span className="sr-only">{t('auth.ownerRoleDescription')}</span></span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            {errors.role && <p id="register-role-error" role="alert" className="mt-2 text-sm text-destructive">{errors.role.message}</p>}
                        </fieldset>

                        <fieldset className="space-y-4">
                            <legend className="mb-3 text-sm font-semibold">{t('autocare.accountDetailsGroup')}</legend>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <FloatingInput
                                    id="name"
                                    type="text"
                                    label={t('auth.name')}
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={errors.name ? 'register-name-error' : undefined}
                                    {...register('name')}
                                />
                                {errors.name && <p id="register-name-error" role="alert" className="mt-2 text-sm text-destructive">{errors.name.message}</p>}
                            </div>
                            <div>
                                <FloatingInput
                                    id="email"
                                    type="email"
                                    label={t('auth.email')}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? 'register-email-error' : undefined}
                                    {...register('email')}
                                />
                                {errors.email && <p id="register-email-error" role="alert" className="mt-2 text-sm text-destructive">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                            <FloatingInput
                                id="password"
                                type="password"
                                label={t('auth.password')}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? 'register-password-error' : undefined}
                                {...register('password')}
                            />
                                {errors.password && <p id="register-password-error" role="alert" className="mt-2 text-sm text-destructive">{errors.password.message}</p>}
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
                                {errors.confirmPassword && <p id="register-confirm-password-error" role="alert" className="mt-2 text-sm text-destructive">{errors.confirmPassword.message}</p>}
                            </div>
                        </div>

                        </fieldset>
                        <fieldset className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-4 text-sm">
                            <legend className="px-1 text-sm font-semibold">{t('autocare.requiredLegalConsents')}</legend>
                            <label className="flex min-h-11 items-start gap-3 text-muted-foreground">
                                <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" {...register('termsAccepted')} />
                                <span>
                                    {t('auth.termsConsentPrefix')} <Link className="font-bold text-primary hover:underline" to={ROUTES.agreement} target="_blank" rel="noreferrer">{t('info.legal.agreement.shortTitle')}</Link>.
                                </span>
                            </label>
                            {errors.termsAccepted && <p role="alert" className="text-sm text-destructive">{errors.termsAccepted.message}</p>}
                            <label className="flex min-h-11 items-start gap-3 text-muted-foreground">
                                <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" {...register('privacyAccepted')} />
                                <span>
                                    {t('auth.privacyConsentPrefix')} <Link className="font-bold text-primary hover:underline" to={ROUTES.privacy} target="_blank" rel="noreferrer">{t('info.legal.privacy.shortTitle')}</Link>.
                                </span>
                            </label>
                            {errors.privacyAccepted && <p role="alert" className="text-sm text-destructive">{errors.privacyAccepted.message}</p>}
                        </fieldset>
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
                            requireLegalConsent
                            legalConsentAccepted={watch('termsAccepted') && watch('privacyAccepted')}
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
