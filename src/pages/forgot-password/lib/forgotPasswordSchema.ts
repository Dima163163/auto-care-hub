import * as z from 'zod'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

export function createForgotPasswordSchema(t: I18nContextValue['t']) {
    return z.object({
        email: z.email(t('auth.validation.validEmail')),
    })
}

export type ForgotPasswordFormValues = z.infer<
    ReturnType<typeof createForgotPasswordSchema>
>
