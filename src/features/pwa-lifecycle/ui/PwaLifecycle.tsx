import { Download, Smartphone, WifiOff, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { reloadApplication } from '../lib/reload-application'
import { useOperationSafety } from '@/shared/lib/operation-safety'

const UPDATE_RELOAD_FALLBACK_MS = 2_000

export function PwaLifecycle() {
    const { t } = useTranslation()
    const isOnline = useOnlineStatus()
    const [isUpdateBlocked, setIsUpdateBlocked] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [updateFailed, setUpdateFailed] = useState(false)
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalling, setIsInstalling] = useState(false)
    const reloadTimerRef = useRef<number | null>(null)
    const { dirtyForms, pendingMutations } = useOperationSafety()

    useEffect(() => {
        const handleInstallPrompt = (event: Event) => {
            event.preventDefault()
            setInstallPrompt(event as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handleInstallPrompt)
        return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
    }, [])

    useEffect(() => {
        const handleInstalled = () => setInstallPrompt(null)
        window.addEventListener('appinstalled', handleInstalled)
        return () => window.removeEventListener('appinstalled', handleInstalled)
    }, [])

    const clearReloadTimer = useCallback(() => {
        if (reloadTimerRef.current !== null) {
            window.clearTimeout(reloadTimerRef.current)
            reloadTimerRef.current = null
        }
    }, [])

    const handleApplicationReload = useCallback(() => {
        clearReloadTimer()
        reloadApplication()
    }, [clearReloadTimer])

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        offlineReady: [offlineReady, setOfflineReady],
        updateServiceWorker,
    } = useRegisterSW({ immediate: true, onNeedReload: handleApplicationReload })

    useEffect(() => clearReloadTimer, [clearReloadTimer])

    const hasProtectedOperations = dirtyForms > 0 || pendingMutations > 0
    const handleUpdate = async () => {
        if (hasProtectedOperations) {
            setIsUpdateBlocked(true)
            return
        }

        setIsUpdateBlocked(false)
        setUpdateFailed(false)
        setIsUpdating(true)
        reloadTimerRef.current = window.setTimeout(
            handleApplicationReload,
            UPDATE_RELOAD_FALLBACK_MS,
        )

        try {
            await updateServiceWorker(true)
        } catch (error) {
            clearReloadTimer()
            console.error('Failed to apply PWA update', error)
            setIsUpdating(false)
            setUpdateFailed(true)
        }
    }

    const handleInstall = async () => {
        if (!installPrompt) return
        setIsInstalling(true)
        try {
            await installPrompt.prompt()
            await installPrompt.userChoice
            setInstallPrompt(null)
        } finally {
            setIsInstalling(false)
        }
    }

    if (isOnline && !needRefresh && !offlineReady && !installPrompt) {
        return null
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 pb-mobile-nav-safe md:pb-0">
            <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3">
                {!isOnline && (
                    <div role="alert" className="flex items-start gap-3 rounded-lg border border-status-warning-border bg-status-warning-surface px-4 py-3 text-status-warning-foreground shadow-lg">
                        <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-semibold">{t('pwa.offlineTitle')}</p>
                            <p className="mt-1 text-sm opacity-80">{t('pwa.offlineDescription')}</p>
                        </div>
                    </div>
                )}

                {needRefresh && (
                    <div role="alert" className="flex items-center gap-3 rounded-lg border border-primary/30 bg-card px-4 py-3 text-card-foreground shadow-lg">
                        <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{t('pwa.updateTitle')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{t('pwa.updateDescription')}</p>
                            {isUpdateBlocked && (
                                <p role="status" className="mt-1 text-sm text-status-warning-foreground">
                                    {t('pwa.updateBlockedDescription')}
                                </p>
                            )}
                            {updateFailed && (
                                <p role="status" className="mt-1 text-sm text-destructive">
                                    {t('pwa.updateFailedDescription')}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUpdate}
                            loading={isUpdating}
                        >
                            {isUpdating ? t('pwa.updateProgress') : t('pwa.updateAction')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setNeedRefresh(false)}
                            aria-label={t('common.close')}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}

                {isOnline && offlineReady && !needRefresh && (
                    <div role="status" className="flex items-center gap-3 rounded-lg border border-status-success-border bg-status-success-surface text-status-success-foreground shadow-lg">
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{t('pwa.offlineReadyTitle')}</p>
                            <p className="mt-1 text-sm opacity-80">{t('pwa.offlineReadyDescription')}</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setOfflineReady(false)}
                            aria-label={t('common.close')}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}

                {isOnline && installPrompt && !needRefresh && (
                    <div role="status" className="flex items-center gap-3 rounded-lg border border-primary/20 bg-card px-4 py-3 text-card-foreground shadow-lg">
                        <Smartphone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{t('pwa.installTitle')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{t('pwa.installDescription')}</p>
                        </div>
                        <Button type="button" size="sm" onClick={handleInstall} loading={isInstalling}>
                            {t('pwa.installAction')}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setInstallPrompt(null)} aria-label={t('common.close')}>
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
