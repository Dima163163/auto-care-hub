import { UserRoleBadge, UserStatusBadge, type User } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'

type GeneralInfoSectionProps = {
    user: User
}

export function GeneralInfoSection({ user }: GeneralInfoSectionProps) {
    const { t } = useTranslation()

    return (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl border bg-card p-6 shadow-sm h-fit">
                <div className="flex size-16 items-center justify-center rounded-full border bg-muted text-xl font-semibold">
                    {user.name.slice(0, 1)}
                </div>

                <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                    {user.name}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                    {user.email}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                    <UserRoleBadge role={user.role} />
                    <UserStatusBadge status={user.status} />
                </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">
                    {t('profile.accountDetails')}
                </h2>

                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.name')}
                        </dt>

                        <dd className="mt-1 font-medium">
                            {user.name}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.email')}
                        </dt>

                        <dd className="mt-1 font-medium">
                            {user.email}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.phone')}
                        </dt>

                        <dd className="mt-1 font-medium">
                            {user.phone || t('common.notProvided')}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.authProvider')}
                        </dt>

                        <dd className="mt-1 font-medium capitalize">
                            {user.provider}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.role')}
                        </dt>

                        <dd className="mt-2">
                            <UserRoleBadge role={user.role} />
                        </dd>
                    </div>

                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.status')}
                        </dt>

                        <dd className="mt-2">
                            <UserStatusBadge status={user.status} />
                        </dd>
                    </div>

                    <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-muted-foreground">
                            {t('profile.createdAt')}
                        </dt>

                        <dd className="mt-1 font-medium">
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </dd>
                    </div>
                </dl>
            </div>

        </div>
    )
}
