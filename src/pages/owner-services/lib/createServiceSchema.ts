import * as z from 'zod'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

export function createServiceSchema(t: I18nContextValue['t']) {
    return z.object({
        cabinetId: z.string().min(1, t('service.validation.cabinetRequired')),
        title: z
            .string()
            .min(3, t('service.validation.titleMin', { count: 3 })),
        description: z.string().optional(),
        durationMinutes: z
            .number()
            .int(t('service.validation.durationInteger'))
            .min(15, t('service.validation.durationMin', { count: 15 })),
        price: z
            .number()
            .int(t('service.validation.priceInteger'))
            .min(0, t('service.validation.priceMin')),
        isActive: z.boolean(),
    })
}

export type CreateServiceFormValues = z.infer<
    ReturnType<typeof createServiceSchema>
>
