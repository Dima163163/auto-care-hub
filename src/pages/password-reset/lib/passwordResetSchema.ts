import * as z from 'zod'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

export function createPasswordResetSchema(t: I18nContextValue['t']) {
    return z
        .object({
            password: z
                .string()
                .min(8, t('auth.validation.passwordMin', { count: 8 })),
            confirmPassword: z
                .string()
                .min(1, t('auth.validation.confirmPasswordRequired')),
        })
        .refine((values) => values.password === values.confirmPassword, {
            message: t('auth.validation.passwordsMustMatch'),
            path: ['confirmPassword'],
        })
}

export type PasswordResetFormValues = z.infer<
    ReturnType<typeof createPasswordResetSchema>
>
