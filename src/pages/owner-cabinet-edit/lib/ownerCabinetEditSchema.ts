import { z } from 'zod'

import type { I18nContextValue } from '@/shared/lib/i18n-context'

export function createOwnerCabinetEditSchema(t: I18nContextValue['t']) {
    return z.object({
        title: z
            .string()
            .min(3, t('cabinet.validation.titleMin', { count: 3 })),
        description: z
            .string()
            .min(10, t('cabinet.validation.descriptionMin', { count: 10 })),
        address: z
            .string()
            .min(5, t('cabinet.validation.addressMin', { count: 5 })),
        city: z
            .string()
            .min(2, t('cabinet.validation.cityMin', { count: 2 })),
        timezone: z.string().min(1),
        amenities: z.string(),
        cancellationPolicy: z.string().max(2000),
        houseRules: z.string().max(2000),
        pricePerHour: z.number().min(0, t('cabinet.validation.priceMin')),
    })
}

export type OwnerCabinetEditFormValues = z.infer<
    ReturnType<typeof createOwnerCabinetEditSchema>
>
