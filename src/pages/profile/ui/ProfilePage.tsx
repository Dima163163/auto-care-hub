import { Heart, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { buttonVariants } from '@/components/ui/button-variants'
import { LogoutButton } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ChangePasswordForm } from './ChangePasswordForm'
import { SessionsList } from './SessionsList'
import { cn } from '@/lib/utils'
import { useProfile } from '../lib/useProfile'
import { ProfileError, ProfileLoading } from './ProfileStates'
import { GeneralInfoSection } from './GeneralInfoSection'
import { VerificationAlert } from './VerificationAlert'
import { ProfileNavigation } from '@/widgets/profile-navigation/ui/ProfileNavigation'
import { ProfilePreferences } from './ProfilePreferences'
import { OAuthConnectionsCard } from './OAuthConnectionsCard'
import { ProfilePrivacy } from './ProfilePrivacy'

export function ProfilePage() {
    const { t } = useTranslation()
    const {
        user,
        isLoading,
        isError,
        isRequesting,
        activeTab,
        tabs,
        handleTabChange,
        handleTabKeyDown,
        onResendVerification,
        getWorkspaceTranslationKey,
    } = useProfile()

    if (isLoading) {
        return <ProfileLoading />
    }

    if (isError || !user) {
        return <ProfileError />
    }

    const accessBadge = user.role === 'client'
        ? t('profile.clientFreeBadge')
        : user.role === 'owner'
            ? t('ownerDashboard.growth.freePlan')
            : t('user.admin')

    return (
        <main className="mx-auto max-w-[var(--layout-operational-max)] space-y-6 px-[var(--layout-gutter)] py-7 lg:py-10">
            <ProfileNavigation />
            <div className="min-w-0 space-y-6">
                    <div className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">{t(getWorkspaceTranslationKey(user.role))}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t('profile.title')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{user.role === 'client' ? t('profile.clientDescription') : t('profile.description')}</p></div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><ShieldCheck className="size-4 text-status-success-foreground" />{t('autocare.trustedBadge')}</span><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><Sparkles className="size-4 text-primary" />{accessBadge}</span></div></div></div>
                    <div className="flex flex-wrap gap-2">{user.role === 'client' && <Link to={ROUTES.favorites} className={buttonVariants({ variant: 'outline' })}><Heart className="size-4" />{t('navigation.favorites')}</Link>}<Link to={user.role === 'client' ? ROUTES.profileReviews : user.role === 'owner' ? ROUTES.ownerDashboard : ROUTES.adminDashboard} className={buttonVariants({ variant: 'outline' })}><MessageCircle className="size-4" />{user.role === 'client' ? t('profile.viewMyReviews') : user.role === 'owner' ? t('navigation.ownerDashboard') : t('navigation.adminDashboard')}</Link><LogoutButton showIcon className="gap-2" /></div>
                    <div role="tablist" aria-label={t('profile.title')} className="flex overflow-x-auto border-b">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id

                            return (
                                <button
                                    key={tab.id}
                                    id={`profile-tab-${tab.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`profile-panel-${tab.id}`}
                                    tabIndex={isActive ? 0 : -1}
                                    onClick={() => handleTabChange(tab.id)}
                                    onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                                    className={cn(
                                        'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap',
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {!user.emailVerifiedAt && (
                        <VerificationAlert isRequesting={isRequesting} onResend={onResendVerification} />
                    )}

                    <div
                        id={`profile-panel-${activeTab}`}
                        role="tabpanel"
                        aria-labelledby={`profile-tab-${activeTab}`}
                        tabIndex={0}
                        className="grid gap-6"
                    >
                        {activeTab === 'general' && (
                            <div className="grid gap-6">
                                <GeneralInfoSection user={user} />
                                {user.role !== 'client' && <ProfilePreferences user={user} />}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="grid gap-6">
                                <OAuthConnectionsCard />
                                {user.provider === 'email' ? (
                                    <ChangePasswordForm />
                                ) : (
                                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                                        <p className="text-muted-foreground">
                                            {t('profile.socialAuthPasswordNotice')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'sessions' && (
                            <SessionsList />
                        )}

                        {activeTab === 'account' && (
                            <ProfilePrivacy />
                        )}
                    </div>
            </div>
        </main>
    )
}
