import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { buttonVariants } from '@/components/ui/button-variants'
import {
    useCompleteEmailVerificationMutation,
    useVerifyEmailVerificationTokenMutation,
} from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function EmailVerificationPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')?.trim() ?? ''
    const lastVerifiedTokenRef = useRef<string | null>(null)
    const isCompletedRef = useRef(false)

    const [
        verifyToken,
        {
            data: tokenDetails,
            error: verificationApiError,
            isLoading: isVerifying,
            isUninitialized: isVerificationUninitialized,
            reset: resetVerification,
        },
    ] = useVerifyEmailVerificationTokenMutation()

    const [completeVerification, {
        isLoading: isCompleting,
        isSuccess: isComplete,
        error: completionError
    }] = useCompleteEmailVerificationMutation()

    useEffect(() => {
        if (token.length < 32 || lastVerifiedTokenRef.current === token) {
            return
        }

        lastVerifiedTokenRef.current = token
        resetVerification()
        void verifyToken({ token })
    }, [resetVerification, token, verifyToken])

    useEffect(() => {
        if (tokenDetails && !isCompleting && !isComplete && !completionError && !isCompletedRef.current) {
            isCompletedRef.current = true
            void completeVerification({ token })
        }
    }, [tokenDetails, isCompleting, isComplete, completionError, completeVerification, token])

    useEffect(() => {
        if (isComplete) {
            toast.success(t('auth.emailVerificationSuccess'))
        }
    }, [isComplete, t])

    const hasValidTokenFormat = token.length >= 32
    const verificationError = !hasValidTokenFormat
        ? t('auth.emailVerificationInvalid')
        : verificationApiError
            ? getApiErrorMessage(
                verificationApiError,
                t('auth.emailVerificationInvalid')
            )
            : completionError
                ? getApiErrorMessage(
                    completionError,
                    t('auth.emailVerificationFailed')
                )
                : null

    const isProcessing =
        hasValidTokenFormat &&
        (isVerificationUninitialized || isVerifying || isCompleting)

    if (isProcessing) {
        return (
            <section
                className="rounded-xl border bg-card p-6 text-center shadow-sm"
                aria-live="polite"
            >
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t('auth.emailVerificationTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.emailVerificationVerifying')}
                </p>
            </section>
        )
    }

    if (verificationError) {
        return (
            <section className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight text-destructive">
                    {t('auth.emailVerificationInvalidTitle')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {verificationError}
                </p>
                <Link
                    to={ROUTES.profile}
                    className={buttonVariants({
                        className: 'mt-6',
                    })}
                >
                    {t('common.back')}
                </Link>
            </section>
        )
    }

    if (isComplete) {
        return (
            <section className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight text-primary">
                    {t('auth.emailVerificationSuccess')}
                </h1>
                <p className="mt-3 text-muted-foreground">
                    {t('auth.emailVerificationDescription')}
                </p>
                <Link
                    to={ROUTES.profile}
                    className={buttonVariants({
                        className: 'mt-6',
                    })}
                >
                    {t('auth.goToHome')}
                </Link>
            </section>
        )
    }

    return null
}
