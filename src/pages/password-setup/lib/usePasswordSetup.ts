import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import {
    getDefaultRouteByRole,
    useCompletePasswordSetupMutation,
    useVerifyPasswordSetupTokenMutation,
} from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    createPasswordSetupSchema,
    type PasswordSetupFormValues,
} from '../lib/passwordSetupSchema'

export function usePasswordSetup() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')?.trim() ?? ''
    const [formError, setFormError] = useState<string | null>(null)
    const lastVerifiedTokenRef = useRef<string | null>(null)
    
    const [
        verifyToken,
        {
            data: tokenDetails,
            error: verificationApiError,
            isLoading: isVerifying,
            isUninitialized: isVerificationUninitialized,
            reset: resetVerification,
        },
    ] = useVerifyPasswordSetupTokenMutation()
    
    const [completeSetup, { isLoading: isCompleting }] =
        useCompletePasswordSetupMutation()
        
    const schema = useMemo(() => createPasswordSetupSchema(t), [t])
    
    const form = useForm<PasswordSetupFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    })

    useEffect(() => {
        if (token.length < 32) {
            return
        }

        if (lastVerifiedTokenRef.current === token) {
            return
        }

        lastVerifiedTokenRef.current = token
        resetVerification()
        void verifyToken({ token })
    }, [resetVerification, token, verifyToken])

    const hasValidTokenFormat = token.length >= 32
    const verificationError = !hasValidTokenFormat
        ? t('auth.passwordSetupInvalid')
        : verificationApiError
            ? getApiErrorMessage(
                verificationApiError,
                t('auth.passwordSetupInvalid')
            )
            : null
            
    const isCheckingToken =
        hasValidTokenFormat &&
        (isVerificationUninitialized || isVerifying)

    const onSubmit = async (values: PasswordSetupFormValues) => {
        setFormError(null)

        try {
            const user = await completeSetup({
                token,
                password: values.password,
            }).unwrap()

            toast.success(t('auth.passwordSetupSuccess'))
            navigate(getDefaultRouteByRole(user.role), {
                replace: true,
            })
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.passwordSetupFailed')
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return {
        tokenDetails,
        isCheckingToken,
        verificationError,
        isCompleting,
        formError,
        form,
        onSubmit: form.handleSubmit(onSubmit),
    }
}
