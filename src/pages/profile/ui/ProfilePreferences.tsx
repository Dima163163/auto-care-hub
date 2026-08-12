import { useState } from 'react'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'

import { useUpdateUserPreferencesMutation, type User } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { Button } from '@/components/ui/button'

type ProfilePreferencesProps = {
    user: User
}

export function ProfilePreferences({ user }: ProfilePreferencesProps) {
    const { t } = useTranslation()
    const [updatePreferences, { isLoading }] = useUpdateUserPreferencesMutation()
    const [preferredCity, setPreferredCity] = useState(user.preferredCity ?? '')
    const [preferredCategories, setPreferredCategories] = useState(
        user.preferredCategories.join(', '),
    )

    const handleToggle = async (
        preference: 'emailNotifications' | 'bookingEmailNotifications',
        enabled: boolean,
    ) => {
        try {
            await updatePreferences({ [preference]: enabled }).unwrap()
            toast.success(t('profile.preferences.updateSuccess'))
        } catch (error) {
            toast.error(
                getApiErrorMessage(error, t('profile.preferences.updateError'))
            )
        }
    }

    const handleSaveDiscoveryPreferences = async () => {
        const categories = preferredCategories
            .split(',')
            .map((category) => category.trim())
            .filter(Boolean)

        try {
            await updatePreferences({
                preferredCity: preferredCity.trim() || null,
                preferredCategories: categories,
            }).unwrap()
            toast.success(t('profile.preferences.updateSuccess'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('profile.preferences.updateError')))
        }
    }

    return (
        <div data-testid="profile-preferences" className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Bell className="size-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">
                    {t('profile.preferences.title')}
                </h2>
            </div>
            
            <p className="mt-2 text-sm text-muted-foreground mb-6">
                {t('profile.preferences.description')}
            </p>

            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/30">
                <div className="space-y-0.5">
                    <h3 className="font-semibold text-foreground">
                        {t('profile.preferences.emailNotifications')}
                    </h3>
                    <p id="email-notifications-description" className="text-sm text-muted-foreground">
                        {t('profile.preferences.emailNotificationsDesc')}
                    </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        id="email-notifications"
                        type="checkbox" 
                        aria-label={t('profile.preferences.emailNotifications')}
                        aria-describedby="email-notifications-description"
                        className="sr-only peer" 
                        checked={user.emailNotifications}
                        disabled={isLoading}
                        onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                    />
                    <div data-testid="email-notifications-track" aria-hidden="true" className="w-11 h-6 rounded-full bg-muted-foreground/30 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                <div className="space-y-0.5">
                    <h3 className="font-semibold text-foreground">
                        {t('profile.preferences.bookingEmailNotifications')}
                    </h3>
                    <p id="booking-email-notifications-description" className="text-sm text-muted-foreground">
                        {t('profile.preferences.bookingEmailNotificationsDesc')}
                    </p>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        id="booking-email-notifications"
                        type="checkbox"
                        aria-label={t('profile.preferences.bookingEmailNotifications')}
                        aria-describedby="booking-email-notifications-description"
                        className="peer sr-only"
                        checked={user.bookingEmailNotifications}
                        disabled={isLoading}
                        onChange={(e) => handleToggle('bookingEmailNotifications', e.target.checked)}
                    />
                    <div data-testid="booking-email-notifications-track" aria-hidden="true" className="peer h-6 w-11 rounded-full bg-muted-foreground/30 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 rtl:peer-checked:after:-translate-x-full" />
                </label>
            </div>

            <div className="mt-4 grid gap-4 rounded-xl border p-4 bg-muted/30">
                <label className="grid gap-2 text-sm font-medium">
                    {t('profile.preferences.preferredCity')}
                    <input className="rounded-lg border bg-background px-3 py-2" value={preferredCity} onChange={(event) => setPreferredCity(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                    {t('profile.preferences.preferredCategories')}
                    <input className="rounded-lg border bg-background px-3 py-2" value={preferredCategories} onChange={(event) => setPreferredCategories(event.target.value)} />
                </label>
                <Button className="justify-self-start" loading={isLoading} type="button" onClick={() => void handleSaveDiscoveryPreferences()}>
                    {isLoading ? t('common.saving') : t('common.save')}
                </Button>
            </div>
        </div>
    )
}
