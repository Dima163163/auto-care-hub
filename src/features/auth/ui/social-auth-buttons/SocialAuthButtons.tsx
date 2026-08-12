import { toast } from 'sonner'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { getDefaultRouteByRole } from '@/features/auth/lib/getDefaultRouteByRole'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { IS_REAL_API } from '@/shared/config/api'

import {
    useGoogleMockLoginMutation,
    useYandexMockLoginMutation,
    useGetOAuthUrlMutation,
} from '../../api/authApi'

type SocialAuthButtonsProps = {
    onSuccess: (path: string) => void
    redirectPath?: string | null
}

export const SocialAuthButtons = ({ onSuccess, redirectPath }: SocialAuthButtonsProps) => {
    const { t } = useTranslation()
    const [googleMockLogin, { isLoading: isGoogleLoading }] = useGoogleMockLoginMutation()
    const [yandexMockLogin, { isLoading: isYandexLoading }] = useYandexMockLoginMutation()
    const [getOAuthUrl, { isLoading: isUrlLoading }] = useGetOAuthUrlMutation()
    const [activeProvider, setActiveProvider] = useState<'google' | 'yandex' | null>(null)

    const isLoading = isGoogleLoading || isYandexLoading || isUrlLoading
    const isGoogleActionLoading = activeProvider === 'google' && (IS_REAL_API ? isUrlLoading : isGoogleLoading)
    const isYandexActionLoading = activeProvider === 'yandex' && (IS_REAL_API ? isUrlLoading : isYandexLoading)

    const handleGoogleLogin = async () => {
        setActiveProvider('google')
        try {
            if (IS_REAL_API) {
                const { authUrl } = await getOAuthUrl({ provider: 'google' }).unwrap()
                window.location.href = authUrl
                return
            }

            const user = await googleMockLogin().unwrap()
            toast.success(t('auth.signedInWithGoogle'))

            onSuccess(redirectPath ?? getDefaultRouteByRole(user.role))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.failedGoogleSignIn'),
            )

            toast.error(message)
        } finally {
            setActiveProvider(null)
        }
    }

    const handleYandexLogin = async () => {
        setActiveProvider('yandex')
        try {
            if (IS_REAL_API) {
                const { authUrl } = await getOAuthUrl({ provider: 'yandex' }).unwrap()
                window.location.href = authUrl
                return
            }

            const user = await yandexMockLogin().unwrap()
            toast.success(t('auth.signedInWithYandex'))

            onSuccess(redirectPath ?? getDefaultRouteByRole(user.role))
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('auth.failedYandexSignIn'),
            )

            toast.error(message)
        } finally {
            setActiveProvider(null)
        }
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        {t('auth.orContinueWith')}
                    </span>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Button
                    type="button"
                    variant="outline"
                    loading={isGoogleActionLoading}
                    disabled={isLoading && !isGoogleActionLoading}
                    onClick={() => void handleGoogleLogin()}
                >
                    {t('auth.continueWithGoogle')}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    loading={isYandexActionLoading}
                    disabled={isLoading && !isYandexActionLoading}
                    onClick={() => void handleYandexLogin()}
                >
                    {t('auth.continueWithYandex')}
                </Button>
            </div>
        </div>
    )
}
