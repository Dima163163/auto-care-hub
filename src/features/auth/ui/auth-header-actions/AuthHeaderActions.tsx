import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useGetMeQuery } from '../../api/authApi'
import { CurrentUserBadge } from '../current-user-badge/CurrentUserBadge'
import { CurrentUserMenu } from '../current-user-menu/CurrentUserMenu'

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

    return <CurrentUserMenu user={user} />
}
