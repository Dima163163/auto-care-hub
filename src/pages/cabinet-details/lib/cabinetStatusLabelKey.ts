import type { CabinetStatus } from '@/entities/cabinet'
import type { TranslationKey } from '@/shared/lib/i18n'

export const cabinetStatusLabelKey = {
    active: 'cabinet.activeStatusLabel',
    draft: 'cabinet.draftStatusLabel',
    blocked: 'cabinet.blockedStatusLabel',
} satisfies Record<CabinetStatus, TranslationKey>
