import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function PasswordResetVerifying() {
    const { t } = useTranslation()
    
    return (
        <section
            className="rounded-xl border bg-card p-6 text-center shadow-sm"
            aria-live="polite"
        >
            <h1 className="text-2xl font-semibold tracking-tight">
                {t('auth.passwordResetTitle')}
            </h1>
            <p className="mt-3 text-muted-foreground">
                {t('auth.passwordResetVerifying')}
            </p>
        </section>
    )
}

type PasswordResetInvalidProps = {
    error: string | null
}

export function PasswordResetInvalid({ error }: PasswordResetInvalidProps) {
    const { t } = useTranslation()
    
    return (
        <section className="rounded-xl border bg-card p-6 text-center shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight">
                {t('auth.passwordResetInvalidTitle')}
            </h1>
            <p className="mt-3 text-muted-foreground">
                {error ?? t('auth.passwordResetInvalid')}
            </p>
            <Link
                to={ROUTES.forgotPassword}
                className={buttonVariants({
                    className: 'mt-6',
                })}
            >
                {t('auth.requestNewResetLink')}
            </Link>
        </section>
    )
}
