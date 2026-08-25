import { useState, type FormEvent } from 'react'
import { MailPlus, ShieldCheck, UserRound, UserRoundX, X } from 'lucide-react'

import {
    useGetOwnerAutoCareProviderMembersQuery,
    useInviteAutoCareProviderMemberMutation,
    useRevokeAutoCareProviderInvitationMutation,
    useRevokeAutoCareProviderMembershipMutation,
    type AutoCareApiProvider,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider; locale: string }
type Copy = { title: string; description: string; email: string; role: string; manager: string; staff: string; invite: string; inviting: string; members: string; invitations: string; empty: string; revoke: string; loading: string; failed: string; sent: string; token: string; owner: string; active: string; pending: string }
const copy: Record<'ru' | 'en', Copy> = {
    ru: { title: 'Команда филиала', description: 'Назначайте менеджеров и сотрудников с доступом только к нужному филиалу.', email: 'Email сотрудника', role: 'Роль', manager: 'Менеджер', staff: 'Сотрудник', invite: 'Пригласить', inviting: 'Отправка…', members: 'Активные доступы', invitations: 'Приглашения', empty: 'Пока нет сотрудников и приглашений.', revoke: 'Отозвать', loading: 'Загрузка команды…', failed: 'Не удалось загрузить команду.', sent: 'Приглашение создано', token: 'Тестовый токен', owner: 'Владелец', active: 'Активен', pending: 'Ожидает ответа' },
    en: { title: 'Branch team', description: 'Assign managers and staff with access limited to the selected branch.', email: 'Staff email', role: 'Role', manager: 'Manager', staff: 'Staff', invite: 'Invite', inviting: 'Sending…', members: 'Active access', invitations: 'Invitations', empty: 'No staff or invitations yet.', revoke: 'Revoke', loading: 'Loading team…', failed: 'Could not load the team.', sent: 'Invitation created', token: 'Test token', owner: 'Owner', active: 'Active', pending: 'Awaiting response' },
} as const

export function OwnerProviderMembersPanel({ provider, locale }: Props) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetOwnerAutoCareProviderMembersQuery(provider.id)
    const [invite, inviteState] = useInviteAutoCareProviderMemberMutation()
    const [revokeInvitation] = useRevokeAutoCareProviderInvitationMutation()
    const [revokeMembership] = useRevokeAutoCareProviderMembershipMutation()
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'manager' | 'staff'>('staff')
    const [success, setSuccess] = useState<string | null>(null)

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const value = email.trim().toLowerCase()
        if (!value) return
        try {
            const result = await invite({ providerId: provider.id, email: value, role, locationId: provider.location.id }).unwrap()
            setEmail('')
            setSuccess(result.inviteToken ? `${text.sent} · ${text.token}: ${result.inviteToken}` : text.sent)
        } catch {
            setSuccess(null)
        }
    }

    if (query.isLoading) return <StateCard variant="loading" title={text.loading} />
    if (query.error) return <StateCard variant="error" title={text.failed} description={getApiErrorMessage(query.error, text.failed)} action={<RetryButton onRetry={query.refetch} label="Retry" />} />

    const members = query.data?.memberships ?? []
    const invitations = query.data?.invitations.filter((item) => item.status === 'pending') ?? []
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h2 className="flex items-center gap-2 text-base font-black text-foreground"><ShieldCheck className="size-4 text-primary" />{text.title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end"><label className="text-xs font-black text-foreground"><span className="mb-1.5 block">{text.email}</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team@example.com" className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary" /></label><label className="text-xs font-black text-foreground"><span className="mb-1.5 block">{text.role}</span><select value={role} onChange={(event) => setRole(event.target.value as 'manager' | 'staff')} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"><option value="staff">{text.staff}</option><option value="manager">{text.manager}</option></select></label><button type="submit" disabled={inviteState.isLoading || !email.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50"><MailPlus className="size-4" />{inviteState.isLoading ? text.inviting : text.invite}</button></form>
        {success && <p role="status" className="mt-3 rounded-[var(--radius-card)] bg-status-success-surface px-3 py-2 text-xs font-bold text-status-success-foreground">{success}</p>}
        {!members.length && !invitations.length ? <p className="mt-4 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-5 lg:grid-cols-2"><MemberList members={members} onRevoke={(membershipId) => void revokeMembership({ providerId: provider.id, membershipId })} text={text} /><InvitationList invitations={invitations} onRevoke={(invitationId) => void revokeInvitation({ providerId: provider.id, invitationId })} text={text} /></div>}
    </section>
}

function MemberList({ members, onRevoke, text }: { members: Array<{ id: string; userId: string; role: 'owner' | 'manager' | 'staff'; status: string }>; onRevoke: (id: string) => void; text: typeof copy.ru }) {
    return <div><h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{text.members}</h3><div className="mt-2 space-y-2">{members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="flex min-w-0 items-center gap-2"><UserRound className="size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{member.userId}</p><p className="text-xs text-muted-foreground">{member.role === 'owner' ? text.owner : member.role === 'manager' ? text.manager : text.staff} · {text.active}</p></div></div>{member.role !== 'owner' && <button type="button" title={text.revoke} onClick={() => onRevoke(member.id)} className="rounded-[var(--radius-control)] p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><UserRoundX className="size-4" /></button>}</div>)}</div></div>
}

function InvitationList({ invitations, onRevoke, text }: { invitations: Array<{ id: string; email: string; role: 'manager' | 'staff'; expiresAt: string }>; onRevoke: (id: string) => void; text: typeof copy.ru }) {
    return <div><h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{text.invitations}</h3><div className="mt-2 space-y-2">{invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{invitation.email}</p><p className="text-xs text-muted-foreground">{invitation.role === 'manager' ? text.manager : text.staff} · {text.pending}</p></div><button type="button" title={text.revoke} onClick={() => onRevoke(invitation.id)} className="rounded-[var(--radius-control)] p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button></div>)}</div></div>
}
