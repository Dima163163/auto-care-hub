import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import type { VariantProps } from 'class-variance-authority'

import type { AppDispatch } from '@/app/store'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { baseApi } from '@/shared/api/baseApi'
import { ROUTES } from '@/shared/constants/routes'
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
        navigate(ROUTES.home, { replace: true })
        const logoutRequest = logout().unwrap()

        try {
            await logoutRequest
            dispatch(baseApi.util.resetApiState())
        } catch {
            alert(t('auth.failedToLogout'))
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
