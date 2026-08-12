import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import {
    useCompletePasswordResetMutation,
    useVerifyPasswordResetTokenMutation,
} from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    createPasswordResetSchema,
    type PasswordResetFormValues,
} from '../lib/passwordResetSchema'

export function usePasswordReset() {
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
    ] = useVerifyPasswordResetTokenMutation()
    
    const [completeReset, { isLoading: isCompleting }] =
        useCompletePasswordResetMutation()
        
    const schema = useMemo(() => createPasswordResetSchema(t), [t])
    
    const form = useForm<PasswordResetFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    })

    useEffect(() => {
        if (token.length < 32 || lastVerifiedTokenRef.current === token) {
            return
        }

        lastVerifiedTokenRef.current = token
        resetVerification()
        void verifyToken({ token })
    }, [resetVerification, token, verifyToken])

    const hasValidTokenFormat = token.length >= 32
    const verificationError = !hasValidTokenFormat
        ? t('auth.passwordResetInvalid')
        : verificationApiError
            ? getApiErrorMessage(
                verificationApiError,
                t('auth.passwordResetInvalid')
            )
            : null
            
    const isCheckingToken =
        hasValidTokenFormat &&
        (isVerificationUninitialized || isVerifying)

    const onSubmit = async (values: PasswordResetFormValues) => {
        setFormError(null)

        try {
            await completeReset({
                token,
                password: values.password,
            }).unwrap()

            toast.success(t('auth.passwordResetSuccess'))
            navigate(ROUTES.login, {
                replace: true,
            })
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.passwordResetFailed')
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return {
        t,
        tokenDetails,
        isCheckingToken,
        verificationError,
        isCompleting,
        formError,
        form,
        onSubmit: form.handleSubmit(onSubmit),
    }
}
