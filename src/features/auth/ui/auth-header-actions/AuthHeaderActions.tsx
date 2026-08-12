import { cn } from '@/lib/utils'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useGetMeQuery } from '../../api/authApi'
import { getAccountLinkTranslationKey } from '../../lib/getAccountLinkTranslationKey'
import { getDefaultRouteByRole } from '../../lib/getDefaultRouteByRole'
import { CurrentUserBadge } from '../current-user-badge/CurrentUserBadge'

export function AuthHeaderActions() {
    const { t } = useTranslation()
    const {
        data: user,
        isLoading,
        isError,
    } = useGetMeQuery()

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <CurrentUserBadge isLoading />
            </div>
        )
    }

    if (isError || !user) {
        return (
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                    to={ROUTES.login}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                    {t('auth.signIn')}
                </Link>

                <Link
                    to={ROUTES.register}
                    className={buttonVariants({ size: 'sm' })}
                >
                    {t('auth.createAccount')}
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
                to={getDefaultRouteByRole(user.role)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "max-md:hidden")}
            >
                {t(getAccountLinkTranslationKey(user.role))}
            </Link>

            <CurrentUserBadge user={user} />
        </div>
    )
}
