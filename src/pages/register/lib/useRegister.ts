import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useRegisterMutation } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { I18nContextValue } from '@/shared/lib/i18n-context'
import { useTranslation } from '@/shared/lib/useTranslation'

function createRegisterSchema(t: I18nContextValue['t']) {
    return z.object({
        name: z.string().min(2, t('auth.validation.nameMin', { count: 2 })),
        email: z.string().email(t('auth.validation.validEmail')),
        password: z
            .string()
            .min(8, t('auth.validation.passwordMin', { count: 8 })),
        confirmPassword: z
            .string()
            .min(1, t('auth.validation.confirmPasswordRequired')),
        role: z.enum(['client', 'owner']),
    }).refine((values) => values.password === values.confirmPassword, {
        message: t('auth.validation.passwordsMustMatch'),
        path: ['confirmPassword'],
    })
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>

export function useRegister() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [formError, setFormError] = useState<string | null>(null)
    const [registerUser, { isLoading }] = useRegisterMutation()
    const schema = useMemo(() => createRegisterSchema(t), [t])

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'client'
        }
    })

    const onSubmit = async (values: RegisterFormValues) => {
        try {
            setFormError(null)

            const user = await registerUser({
                name: values.name,
                email: values.email,
                password: values.password,
                role: values.role
            }).unwrap()

            navigate(ROUTES.onboarding, {
                replace: true,
                state: {
                    role: user.role,
                },
            })
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.failedToCreateAccount'),
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
        form,
        onSubmit: form.handleSubmit(onSubmit)
    }
}
