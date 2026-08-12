import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { getDefaultRouteByRole } from '@/features/auth/lib/getDefaultRouteByRole'
import { useTranslation } from '@/shared/lib/useTranslation'

export function LoginCallbackPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { data: user, isError, isSuccess } = useGetMeQuery()

    useEffect(() => {
        if (isSuccess && user) {
            navigate(getDefaultRouteByRole(user.role), { replace: true })
        }
    }, [isSuccess, user, navigate])

    useEffect(() => {
        if (isError) {
            navigate(`${ROUTES.login}?error=processing_failed`, {
                replace: true,
            })
        }
    }, [isError, navigate])

    return (
        <div className="flex min-h-[420px] items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-10 py-12 text-center shadow-sm">
                <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-muted-foreground">
                    {t('auth.completingSignIn')}
                </p>
            </div>
        </div>
    )
}
