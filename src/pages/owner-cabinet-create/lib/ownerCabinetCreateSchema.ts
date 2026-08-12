import { z } from 'zod'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

export function createOwnerCabinetCreateSchema(t: I18nContextValue['t']) {
    return z.object({
        title: z
            .string()
            .min(3, t('cabinet.validation.titleMin', { count: 3 })),
        description: z
            .string()
            .min(20, t('cabinet.validation.descriptionMin', { count: 20 })),
        address: z
            .string()
            .min(3, t('cabinet.validation.addressMin', { count: 3 })),
        city: z
            .string()
            .min(2, t('cabinet.validation.cityMin', { count: 2 })),
        pricePerHour: z.number().min(0, t('cabinet.validation.priceMin')),
    })
}

export type OwnerCabinetCreateFormValues = z.infer<
    ReturnType<typeof createOwnerCabinetCreateSchema>
>
