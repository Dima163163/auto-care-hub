import { CarFront, Globe2, MessageCircle, ShieldCheck, Store } from 'lucide-react'
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
    const registrationBenefits = [
        'auth.registrationBenefit1',
        'auth.registrationBenefit2',
        'auth.registrationBenefit3',
    ] as const

    useEffect(() => {
        if (formError) {
            formErrorRef.current?.focus()
        }
    }, [formError])

    return (
        <main className="w-full">
            <section className="mx-auto">
                <div className="mb-7">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                            {t('auth.registrationEyebrow')}
                        </p>
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                            AutoCare Hub
                        </span>
                    </div>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
                        {t('auth.joinTitle')}
                    </h1>

                    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        {t(IS_MOCK_API ? 'auth.joinDescription' : 'auth.joinDescriptionReal')}
                    </p>
                </div>

                <form onSubmit={onSubmit} className="rounded-[var(--radius-panel)] border border-border/80 bg-card/95 p-5 shadow-[0_18px_50px_-28px_hsl(var(--foreground)/.35)] backdrop-blur sm:p-7">
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
                        <div>
                            <div className="flex items-end justify-between gap-3">
                                <p className="text-sm font-black text-foreground">{t('auth.accountType')}</p>
                                <span className="text-[11px] font-medium text-muted-foreground">1 / 2</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('auth.accountTypeDescription')}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="group relative cursor-pointer">
                                    <input type="radio" value="client" className="peer sr-only" {...register('role')} />
                                    <span className="block rounded-[var(--radius-card)] border border-border bg-background p-4 transition-all peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:shadow-[0_0_0_3px_hsl(var(--primary)/.1)] group-hover:border-primary/50">
                                        <span className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><CarFront className="size-4" /></span>
                                            <span><span className="block text-sm font-black">{t('auth.clientRoleTitle')}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('auth.clientRoleDescription')}</span></span>
                                        </span>
                                    </span>
                                </label>
                                <label className="group relative cursor-pointer">
                                    <input type="radio" value="owner" className="peer sr-only" {...register('role')} />
                                    <span className="block rounded-[var(--radius-card)] border border-border bg-background p-4 transition-all peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:shadow-[0_0_0_3px_hsl(var(--primary)/.1)] group-hover:border-primary/50">
                                        <span className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Store className="size-4" /></span>
                                            <span><span className="block text-sm font-black">{t('auth.ownerRoleTitle')}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('auth.ownerRoleDescription')}</span></span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            {errors.role && <p id="register-role-error" role="alert" className="mt-2 text-sm text-destructive">{errors.role.message}</p>}
                        </div>

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

                    </div>

                    <Button
                        type="submit"
                        loading={isSubmitting || isLoading}
                        className="mt-6 w-full"
                    >
                        {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                    </Button>

                    <div className="mt-5 grid gap-2 border-t border-border pt-5 text-xs font-semibold text-muted-foreground sm:grid-cols-3">
                        {registrationBenefits.map((benefitKey, index) => {
                            const Icon = [ShieldCheck, MessageCircle, Globe2][index]
                            return <span key={benefitKey} className="flex items-start gap-2"><Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />{t(benefitKey)}</span>
                        })}
                    </div>

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
