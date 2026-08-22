import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { getDefaultRouteByRole } from '@/features/auth/lib/getDefaultRouteByRole'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'

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
        <div role="status" aria-label={t('auth.completingSignIn')} className="flex min-h-[420px] items-center justify-center bg-background">
            <div className="w-full max-w-sm rounded-xl border bg-card px-10 py-12 text-center shadow-sm">
                <Skeleton className="mx-auto h-7 w-40" />
                <Skeleton className="mx-auto mt-4 h-4 w-56" />
                <Skeleton className="mx-auto mt-8 h-10 w-32 rounded-md" />
            </div>
        </div>
    )
}
