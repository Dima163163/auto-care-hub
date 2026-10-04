import { useTranslation } from '@/shared/lib/useTranslation'

// This component and its synthetic accounts are excluded from real builds.
export default function MockLoginGuidance() {
    const { t } = useTranslation()
    return (
        <div className="mt-6 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">
                {t('auth.mockUsers')}
            </p>

            <ul className="mt-3 space-y-2">
                <li>{t('auth.mockOwner', { email: 'sophia.miller@example.com' })}</li>
                <li>{t('auth.mockStaff', { email: 'ilya.orlov@proservice.test' })}</li>
                <li>{t('auth.mockAdmin', { email: 'admin@autocarehub.test' })}</li>
                <li>{t('auth.mockClient', { email: 'emily.carter@example.com' })}</li>
            </ul>

            <p className="mt-3">
                {t('auth.mockPasswordHint')}
            </p>
        </div>
    )
}
