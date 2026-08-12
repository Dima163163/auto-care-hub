import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router'
import * as z from 'zod'
import { toast } from 'sonner'

import { getDefaultRouteByRole, useLoginMutation } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { I18nContextValue } from '@/shared/lib/i18n-context'
import { useTranslation } from '@/shared/lib/useTranslation'
import {
    parseLoginLocationState,
    type LoginRedirectLocation,
} from './parse-login-location-state'

function createLoginSchema(t: I18nContextValue['t']) {
    return z.object({
        email: z.string().email(t('auth.validation.validEmail')),
        password: z.string().min(1, t('auth.validation.passwordRequired')),
    })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

function getRedirectPath(from?: LoginRedirectLocation) {
    if (!from) {
        return null
    }

    const path = `${from.pathname}${from.search}${from.hash}`

    if (from.pathname === ROUTES.login || from.pathname === ROUTES.register) {
        return null
    }

    return path
}

export function useLogin() {
    const { t } = useTranslation()
    const location = useLocation()
    const locationState = parseLoginLocationState(location.state)
    const redirectPath = getRedirectPath(locationState?.from)
    const shouldShowContinueMessage = Boolean(locationState?.from)
    const navigate = useNavigate()
    const [formError, setFormError] = useState<string | null>(null)
    const [login, { isLoading }] = useLoginMutation()
    
    const schema = useMemo(() => createLoginSchema(t), [t])

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
            password: ''
        }
    })

    const onSubmit = async (values: LoginFormValues) => {
        setFormError(null)
        try {
            const user = await login(values).unwrap()

            navigate(redirectPath ?? getDefaultRouteByRole(user.role), {
                replace: true
            })
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.failedToSignIn'),
            )

            setFormError(message)
            toast.error(message)
        }
    }

    return {
        t,
        navigate,
        formError,
        isLoading,
        shouldShowContinueMessage,
        redirectPath,
        form,
        onSubmit: form.handleSubmit(onSubmit)
    }
}
