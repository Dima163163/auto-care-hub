import { Calendar, User, LayoutDashboard, Clock, CheckCircle2, Clock3 } from 'lucide-react'
import { Counter } from '@/shared/ui/counter/Counter'
import { useTranslation } from '@/shared/lib/useTranslation'

export function LandingHeroMockCard() {
    const { t } = useTranslation()

    const bookings = [
        { nameKey: 'landing.bookingName1', cabKey: 'landing.bookingCabinet2', timeKey: 'landing.bookingToday1100', statusKey: 'landing.bookingConfirmed', color: 'bg-status-success-surface text-status-success-foreground' },
        { nameKey: 'landing.bookingName2', cabKey: 'landing.bookingCabinet1', timeKey: 'landing.bookingToday1230', statusKey: 'landing.bookingPending', color: 'bg-status-warning-surface text-status-warning-foreground' },
        { nameKey: 'landing.bookingName3', cabKey: 'landing.bookingCabinet3', timeKey: 'landing.bookingTomorrow1000', statusKey: 'landing.bookingConfirmed', color: 'bg-status-success-surface text-status-success-foreground' },
        { nameKey: 'landing.bookingName1', cabKey: 'landing.bookingCabinet1', timeKey: 'landing.bookingToday1230', statusKey: 'landing.bookingPending', color: 'bg-status-warning-surface text-status-warning-foreground' },
    ] as const

    const weekdays = [
        'landing.weekdayMonShort',
        'landing.weekdayTueShort',
        'landing.weekdayWedShort',
        'landing.weekdayThuShort',
        'landing.weekdayFriShort',
        'landing.weekdaySatShort',
        'landing.weekdaySunShort',
    ] as const

    return (
        <div
            className="autocarehub-motion-scale-in relative lg:ml-4 perspective-1000 w-full"
        >
            {/* Main Card Container with fixed height but fluid width */}
            <div className="relative flex h-[480px] w-full overflow-hidden rounded-[1.5rem] border bg-background shadow-2xl ring-1 ring-border/40">

                {/* Slim Sidebar */}
                <div className="flex w-14 shrink-0 flex-col items-center border-r bg-muted/10 py-5 gap-5 hidden sm:flex">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-sm">
                        B
                    </div>
                    <div className="flex flex-col gap-3 mt-2 w-full px-2">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <LayoutDashboard className="size-4" />
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                            <Calendar className="size-4" />
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                            <Clock className="size-4" />
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                            <User className="size-4" />
                        </div>
                    </div>
                </div>

                {/* Dashboard Main Content */}
                <div className="flex-1 p-5 sm:p-6 flex flex-col gap-5 overflow-hidden bg-background/80">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold tracking-tight leading-none">{t('landing.dashboardWelcome')}</h3>
                            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{t('landing.dashboardSubtitle')}</p>
                        </div>
                        <div className="size-8 rounded-full border bg-card flex items-center justify-center text-xs font-bold">A</div>
                    </div>

                    {/* Compact Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border bg-card p-3 shadow-sm">
                            <div className="flex items-center gap-1.5 text-primary mb-1">
                                <Calendar className="size-3" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('landing.dashboardBookings')}</span>
                            </div>
                            <p className="text-xl font-black tabular-nums"><Counter value={24} /></p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 shadow-sm">
                            <div className="flex items-center gap-1.5 text-status-success-foreground mb-1">
                                <CheckCircle2 className="size-3" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('landing.dashboardRequests')}</span>
                            </div>
                            <p className="text-xl font-black tabular-nums"><Counter value={18} /></p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 shadow-sm transition-transform hover:-translate-y-0.5">
                            <div className="flex items-center gap-1.5 text-status-warning-foreground mb-1">
                                <LayoutDashboard className="size-3" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('landing.dashboardCabinets')}</span>
                            </div>
                            <p className="text-xl font-black tabular-nums"><Counter value={4} /></p>
                        </div>
                        <div className="rounded-xl border bg-card p-3 shadow-sm transition-transform hover:-translate-y-0.5">
                            <div className="flex items-center gap-1.5 text-status-danger-foreground mb-1">
                                <User className="size-3" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('landing.dashboardReviews')}</span>
                            </div>
                            <p className="text-xl font-black tabular-nums"><Counter value={2} /></p>
                        </div>
                    </div>

                    {/* Feed and Calendar Section */}
                    <div className="grid sm:grid-cols-[1.3fr_0.7fr] gap-5 flex-1 min-h-0">
                        {/* Bookings List */}
                        <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
                            <div className="border-b bg-muted/5 px-4 py-3 flex items-center justify-between">
                                <h4 className="font-bold text-xs uppercase tracking-wide">{t('landing.latestBookings')}</h4>
                                <span className="text-xs font-medium text-primary cursor-pointer hover:underline">{t('landing.viewAllBookings')}</span>
                            </div>
                            <div className="p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                                {bookings.map((b, i) => (
                                    <div key={i} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                                {t(b.nameKey).charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate">{t(b.nameKey)}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <Clock3 className="size-2.5" />
                                                    <span className="truncate">{t(b.cabKey)} • {t(b.timeKey)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-black ${b.color}`}>
                                            {t(b.statusKey)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Mini Calendar Mock */}
                        <div className="rounded-xl border bg-card shadow-sm p-4 hidden sm:flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-xs uppercase tracking-wide">{t('landing.calendarMonth')}</h4>
                                <div className="flex gap-1">
                                    <div className="size-5 rounded border flex items-center justify-center text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer">&lt;</div>
                                    <div className="size-5 rounded border flex items-center justify-center text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer">&gt;</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[8px] mb-2 text-muted-foreground font-black uppercase">
                                {weekdays.map((weekday) => <div key={weekday}>{t(weekday)}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center text-xs font-bold">
                                {Array.from({ length: 31 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`p-1 rounded-md transition-all ${i + 1 === 15 ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted cursor-pointer'} ${[4, 11, 18, 25].includes(i) ? 'text-status-danger-foreground' : ''}`}
                                    >
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-auto pt-3 border-t border-dashed">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="uppercase text-muted-foreground">{t('landing.loadTitle')}</span>
                                    <span>78%</span>
                                </div>
                                <div className="h-1 w-full bg-muted rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full bg-primary rounded-full w-[78%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
