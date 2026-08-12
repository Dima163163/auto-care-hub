import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
    useGetMeQuery,
    useRequestEmailVerificationMutation,
} from '@/features/auth'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

export function useProfile() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'general'

    const {
        data: user,
        isLoading,
        isError,
    } = useGetMeQuery()

    const [requestVerification, { isLoading: isRequesting }] =
        useRequestEmailVerificationMutation()

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab })
    }

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
        const tabIndex = tabs.findIndex((tab) => tab.id === tabId)

        if (tabIndex === -1) {
            return
        }

        const nextTabIndex = event.key === 'ArrowRight'
            ? (tabIndex + 1) % tabs.length
            : event.key === 'ArrowLeft'
                ? (tabIndex - 1 + tabs.length) % tabs.length
                : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                        ? tabs.length - 1
                        : null

        if (nextTabIndex === null) {
            return
        }

        event.preventDefault()
        handleTabChange(tabs[nextTabIndex]?.id ?? 'general')
    }

    const onResendVerification = async () => {
        try {
            await requestVerification().unwrap()
            toast.success(t('auth.resendEmailVerificationSent'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t('auth.resendEmailVerificationFailed')
                )
            )
        }
    }

    const getWorkspaceTranslationKey = (role: string): TranslationKey => {
        switch (role) {
            case 'admin':
            case 'super_admin':
                return 'workspace.admin'
            case 'owner':
                return 'workspace.owner'
            default:
                return 'workspace.client'
        }
    }

    const tabs = [
        { id: 'general', label: t('profile.tabs.general') },
        { id: 'security', label: t('profile.tabs.security') },
        { id: 'sessions', label: t('profile.tabs.sessions') },
    ]

    const currentTabId = tabs.find(t => t.id === activeTab) ? activeTab : 'general'

    return {
        user,
        isLoading,
        isError,
        isRequesting,
        activeTab: currentTabId,
        tabs,
        handleTabChange,
        handleTabKeyDown,
        onResendVerification,
        getWorkspaceTranslationKey,
    }
}
