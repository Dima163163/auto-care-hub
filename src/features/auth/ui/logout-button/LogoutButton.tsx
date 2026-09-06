import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import type { VariantProps } from 'class-variance-authority'

import type { AppDispatch } from '@/app/store'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { baseApi } from '@/shared/api/baseApi'
import { ROUTES } from '@/shared/constants/routes'
import { beginLogout, endLogout } from '@/shared/lib/auth-session-state'
import { useTranslation } from '@/shared/lib/useTranslation'

import { useLogoutMutation } from '../../api/authApi'

type LogoutButtonProps = {
    className?: string
    compactAtTablet?: boolean
    showIcon?: boolean
    size?: VariantProps<typeof buttonVariants>['size']
    variant?: VariantProps<typeof buttonVariants>['variant']
}

export function LogoutButton({
    className,
    compactAtTablet = false,
    showIcon = false,
    size = 'sm',
    variant = 'outline',
}: LogoutButtonProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const dispatch = useDispatch<AppDispatch>()
    const [logout, { isLoading }] = useLogoutMutation()

    const handleLogout = async () => {
        beginLogout()
        // Commit the public route before logout resets the shared RTK cache.
        // Otherwise RequireAuth can observe its query becoming empty for one
        // render and redirect the freshly-public shell back to /login.
        navigate(ROUTES.home, { replace: true })
        try {
            await logout().unwrap()
        } catch {
            alert(t('auth.failedToLogout'))
        } finally {
            // The mutation lifecycle clears credentials immediately, while
            // the private RTK cache is reset here only after unwrap settles.
            // Keeping logoutInProgress active through this dispatch prevents
            // RequireAuth from racing the public route on fast aborts.
            dispatch(baseApi.util.resetApiState())
            // Re-assert the public destination after the mutation lifecycle
            // settles. This covers BrowserRouter transitions that were still
            // rendering the protected tree when an immediate failure reset
            // the /me query.
            navigate(ROUTES.home, { replace: true })
            endLogout()
        }
    }

    return (
        <Button
            type="button"
            size={size}
            variant={variant}
            className={className}
            loading={isLoading}
            aria-label={isLoading ? t('auth.loggingOut') : t('auth.logOut')}
            title={isLoading ? t('auth.loggingOut') : t('auth.logOut')}
            onClick={() => void handleLogout()}
        >
            {showIcon && !isLoading && <LogOut className="size-4" />}
            <span className={compactAtTablet ? 'max-lg:hidden' : undefined}>
                {isLoading ? t('auth.loggingOut') : t('auth.logOut')}
            </span>
        </Button>
    )
}
