import { MailPlus, ShieldCheck, UserRound, UserRoundX, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import {
    useGetOwnerAutoCareProviderMembersQuery,
    useInviteAutoCareProviderMemberMutation,
    useRevokeAutoCareProviderInvitationMutation,
    useRevokeAutoCareProviderMembershipMutation,
} from '@/entities/automotive-service'
import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { I18nContextValue } from '@/shared/lib/i18n-context'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider }
type Translator = I18nContextValue['t']

export function OwnerProviderMembersPanel({ provider }: Props) {
    const { t } = useTranslation()
    const query = useGetOwnerAutoCareProviderMembersQuery(provider.id)
    const [invite, inviteState] = useInviteAutoCareProviderMemberMutation()
    const [revokeInvitation, revokeInvitationState] = useRevokeAutoCareProviderInvitationMutation()
    const [revokeMembership, revokeMembershipState] = useRevokeAutoCareProviderMembershipMutation()
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'manager' | 'staff'>('staff')
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [revokingId, setRevokingId] = useState<string | null>(null)
    const isRevoking = revokeInvitationState.isLoading || revokeMembershipState.isLoading

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const value = email.trim().toLowerCase()
        if (!value) return
        try {
            setSuccess(null)
            setError(null)
            const result = await invite({ providerId: provider.id, email: value, role, locationId: provider.location.id }).unwrap()
            setEmail('')
            setSuccess(result.inviteToken ? `${t('autocare.ownerProviderMembersInviteCreated')} · ${t('autocare.ownerProviderMembersInviteToken')}: ${result.inviteToken}` : t('autocare.ownerProviderMembersInviteCreated'))
        } catch (reason) {
            setSuccess(null)
            setError(getApiErrorMessage(reason, t('autocare.ownerProviderMembersInviteError')))
        }
    }

    const revoke = async (kind: 'invitation' | 'membership', id: string) => {
        if (isRevoking) return
        setSuccess(null)
        setError(null)
        setRevokingId(id)
        try {
            if (kind === 'invitation') await revokeInvitation({ providerId: provider.id, invitationId: id }).unwrap()
            else await revokeMembership({ providerId: provider.id, membershipId: id }).unwrap()
            setSuccess(t('autocare.ownerProviderMembersRevoked'))
        } catch (reason) {
            setError(getApiErrorMessage(reason, t('autocare.ownerProviderMembersRevokeError')))
        } finally {
            setRevokingId(null)
        }
    }

    if (query.isLoading) return <StateCard variant="loading" title={t('autocare.ownerProviderMembersLoading')} />
    if (query.error) return <StateCard variant="error" title={t('autocare.ownerProviderMembersFailed')} description={getApiErrorMessage(query.error, t('autocare.ownerProviderMembersFailed'))} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />

    const members = query.data?.memberships ?? []
    const invitations = query.data?.invitations.filter((item) => item.status === 'pending') ?? []
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-foreground"><ShieldCheck className="size-4 text-primary" />{t('autocare.ownerProviderMembersTitle')}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderMembersDescription')}</p></div></div>
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end"><label className="text-xs font-black text-foreground"><span className="mb-1.5 block">{t('autocare.ownerProviderMembersEmail')}</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('autocare.ownerProviderMembersEmailPlaceholder')} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary" /></label><label className="text-xs font-black text-foreground"><span className="mb-1.5 block">{t('autocare.ownerProviderMembersRole')}</span><select value={role} onChange={(event) => setRole(event.target.value as 'manager' | 'staff')} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"><option value="staff">{t('autocare.ownerProviderMembersStaff')}</option><option value="manager">{t('autocare.ownerProviderMembersManager')}</option></select></label><button type="submit" disabled={inviteState.isLoading || !email.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50"><MailPlus className="size-4" />{inviteState.isLoading ? t('autocare.ownerProviderMembersInviting') : t('autocare.ownerProviderMembersInvite')}</button></form>
        {success && <p role="status" className="mt-3 rounded-[var(--radius-card)] bg-status-success-surface px-3 py-2 text-xs font-bold text-status-success-foreground">{success}</p>}
        {error && <p role="alert" className="mt-3 rounded-[var(--radius-card)] bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">{error}</p>}
        {!members.length && !invitations.length ? <p className="mt-4 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{t('autocare.ownerProviderMembersEmpty')}</p> : <div className="mt-5 grid gap-5 lg:grid-cols-2"><MemberList members={members} onRevoke={(membershipId) => void revoke('membership', membershipId)} revokingId={revokingId} isRevoking={isRevoking} t={t} /><InvitationList invitations={invitations} onRevoke={(invitationId) => void revoke('invitation', invitationId)} revokingId={revokingId} isRevoking={isRevoking} t={t} /></div>}
    </section>
}

function MemberList({ members, onRevoke, revokingId, isRevoking, t }: { members: Array<{ id: string; userId: string; user: { name: string; email: string } | null; role: 'owner' | 'manager' | 'staff'; status: string }>; onRevoke: (id: string) => void; revokingId: string | null; isRevoking: boolean; t: Translator }) {
    return <div data-testid="owner-provider-members"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{t('autocare.ownerProviderMembersAccess')}</h3><div className="mt-2 space-y-2">{members.map((member) => { const isActive = member.status === 'active'; const statusLabel = isActive ? t('autocare.ownerProviderMembersActive') : t('autocare.ownerProviderMembersRevoked'); const isCurrentRevoke = revokingId === member.id; return <div key={member.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="flex min-w-0 items-center gap-2"><UserRound className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{member.user?.name ?? member.userId}</p><p className="truncate text-xs text-muted-foreground">{member.role === 'owner' ? t('autocare.ownerProviderMembersOwner') : member.role === 'manager' ? t('autocare.ownerProviderMembersManager') : t('autocare.ownerProviderMembersStaff')} · {statusLabel}{member.user?.email ? ` · ${member.user.email}` : ''}</p></div></div>{member.role !== 'owner' && isActive && <button data-testid="owner-member-revoke" type="button" aria-label={isCurrentRevoke ? t('autocare.ownerProviderMembersRevoking') : `${t('autocare.ownerProviderMembersRevoke')}: ${member.user?.name ?? member.userId}`} title={isCurrentRevoke ? t('autocare.ownerProviderMembersRevoking') : t('autocare.ownerProviderMembersRevoke')} disabled={isRevoking} onClick={() => onRevoke(member.id)} className="rounded-[var(--radius-control)] p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50">{isCurrentRevoke ? <span aria-hidden="true" className="px-0.5 text-[10px] font-black">…</span> : <UserRoundX className="size-4" />}</button>}</div> })}</div></div>
}

function InvitationList({ invitations, onRevoke, revokingId, isRevoking, t }: { invitations: Array<{ id: string; email: string; role: 'manager' | 'staff'; expiresAt: string }>; onRevoke: (id: string) => void; revokingId: string | null; isRevoking: boolean; t: Translator }) {
    return <div data-testid="owner-provider-invitations"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{t('autocare.ownerProviderMembersInvitations')}</h3><div className="mt-2 space-y-2">{invitations.map((invitation) => { const isCurrentRevoke = revokingId === invitation.id; return <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{invitation.email}</p><p className="text-xs text-muted-foreground">{invitation.role === 'manager' ? t('autocare.ownerProviderMembersManager') : t('autocare.ownerProviderMembersStaff')} · {t('autocare.ownerProviderMembersPending')}</p></div><button data-testid="owner-invitation-revoke" type="button" aria-label={isCurrentRevoke ? t('autocare.ownerProviderMembersRevoking') : `${t('autocare.ownerProviderMembersRevoke')}: ${invitation.email}`} title={isCurrentRevoke ? t('autocare.ownerProviderMembersRevoking') : t('autocare.ownerProviderMembersRevoke')} disabled={isRevoking} onClick={() => onRevoke(invitation.id)} className="rounded-[var(--radius-control)] p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50">{isCurrentRevoke ? <span aria-hidden="true" className="px-0.5 text-[10px] font-black">…</span> : <X className="size-4" />}</button></div> })}</div></div>
}
