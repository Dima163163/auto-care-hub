import { CircleHelp, Info, Store, UsersRound } from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'

export const headerInfoLinks: Array<{
    to: string
    labelKey: TranslationKey
    descriptionKey: TranslationKey
    icon: typeof CircleHelp
}> = [
    { to: ROUTES.help, labelKey: 'navigation.helpCenter', descriptionKey: 'navigation.helpCenterDescription', icon: CircleHelp },
    { to: ROUTES.about, labelKey: 'navigation.about', descriptionKey: 'navigation.aboutDescription', icon: Info },
    { to: ROUTES.features, labelKey: 'navigation.clientInfo', descriptionKey: 'navigation.clientInfoDescription', icon: UsersRound },
    { to: ROUTES.owners, labelKey: 'navigation.ownerInfo', descriptionKey: 'navigation.ownerInfoDescription', icon: Store },
]
