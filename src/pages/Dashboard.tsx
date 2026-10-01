import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BellPlus, CalendarHeart, CalendarDays, Contact, HandCoins, PieChart as PieIcon, Plus, ShoppingBag, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { addMonths, endOfMonth, fmtMonth, greeting, money, monthKey, startOfMonth, sum, toISODate, today } from '../lib/format'
import { byCategory, eventSummary, partySummary } from '../lib/selectors'
import { EVENT_KINDS } from '../lib/icons'
import { BreakdownList, ChartTooltip, Donut } from '../components/charts'
import { TransactionList } from '../components/TransactionList'
import { ComingUp } from '../components/ComingUp'
import { NotificationSetup } from './Reminders'
import { Badge, Button, Card, CardHeader, cn, EmptyState, IconBubble, Progress, Segmented } from '../components/ui'

export default function Dashboard() {
  const { transactions, categories, events, parties, reminders, settings, loadSample } = useStore()
  const { openTx, openForm } = useUI()
  const cur = settings.currency
  const [scope, setScope] = useState<'all' | 'daily'>('all')

  const data = useMemo(() => {
    const now = new Date()
    const mStart = startOfMonth(now)
    const mEnd = endOfMonth(now)
    const lmStart = startOfMonth(addMonths(now, -1))
    const lmEnd = endOfMonth(addMonths(now, -1))
    const t = today()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const ws = toISODate(weekStart)
    const scoped = scope === 'daily' ? transactions.filter((x) => !x.eventId) : transactions
    const exp = scoped.filter((x) => x.type === 'expense')
    const month = exp.filter((x) => x.date >= mStart && x.date <= mEnd)
    const lastMonth = sum(exp.filter((x) => x.date >= lmStart && x.date <= lmEnd), (x) => x.amount)
    const monthSpent = sum(month, (x) => x.amount)
    const monthIncome = sum(scoped.filter((x) => x.type === 'income' && x.date >= mStart && x.date <= mEnd), (x) => x.amount)
    const dailyMonthSpent = sum(transactions.filter((x) => x.type === 'expense' && !x.eventId && x.date >= mStart && x.date <= mEnd), (x) => x.amount)
    const todaySpent = sum(exp.filter((x) => x.date === t), (x) => x.amount)
    const weekSpent = sum(exp.filter((x) => x.date >= ws && x.date <= t), (x) => x.amount)

    const trend = Array.from({ length: 6 }, (_, i) => {
      const k = monthKey(toISODate(addMonths(now, i - 5)))
      const inMonth = scoped.filter((x) => monthKey(x.date) === k)
      return { key: k, Expense: sum(inMonth.filter((x) => x.type === 'expense'), (x) => x.amount), Income: sum(inMonth.filter((x) => x.type === 'income'), (x) => x.amount) }
    })

    let owe = 0
    let receive = 0
    const dues = parties
      .map((p) => ({ p, s: partySummary(p, transactions), ev: events.find((e) => e.id === p.eventId) }))
      .filter((x) => x.s.due > 0)
    for (const d of dues) {
      if (d.p.direction === 'pay') owe += d.s.due
      else receive += d.s.due
    }
    dues.sort((a, b) => b.s.due - a.s.due)

    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
    return {
      monthSpent, monthIncome, lastMonth, dailyMonthSpent, todaySpent, weekSpent, trend, owe, receive, daysLeft,
      dues: dues.filter((d) => d.p.direction === 'pay').slice(0, 5),
      cats: byCategory(month, categories),
      change: lastMonth > 0 ? ((monthSpent - lastMonth) / lastMonth) * 100 : null,
    }
  }, [transactions, categories, events, parties, scope])

  const activeEvents = events.filter((e) => e.status === 'active').slice(0, 4)
  const isEmpty = transactions.length === 0 && events.length === 0
  const budget = settings.monthlyBudget
  const budgetLeft = budget - data.dailyMonthSpent

  if (isEmpty) {
    return (
      <div className="anim-rise">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{greeting()}{settings.name ? `, ${settings.name}` : ''} 👋</h1>
        <p className="text-sm text-muted mt-1">Let's set up your money tracker.</p>
        <Card className="mt-6 overflow-hidden">
          <div className="relative p-6 sm:p-10 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
            <Sparkles className="size-8 mb-4 opacity-90" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight max-w-lg">Every rupee — daily spends, home building, weddings — in one place.</h2>
            <p className="mt-3 text-white/80 text-sm max-w-lg">Log daily expenses in seconds, create events for big projects, and track exactly who you have to pay, how much you've paid, and what's left.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 p-4 sm:p-6">
            {[
              { icon: Wallet, title: 'Add an expense', text: 'Tea, groceries, fuel, bills…', onClick: () => openTx(), color: '#5b5ef4' },
              { icon: CalendarHeart, title: 'Create an event', text: 'Home, wedding, trip, festival', to: '/events?new=1', color: '#ec4899' },
              { icon: Sparkles, title: 'Explore with sample data', text: 'See how it all works', onClick: loadSample, color: '#f97316' },
            ].map((a) => {
              const inner = (
                <>
                  <IconBubble lucide={a.icon} color={a.color} size="lg" />
                  <div className="text-left">
                    <p className="font-bold text-sm">{a.title}</p>
                    <p className="text-xs text-muted mt-0.5">{a.text}</p>
                  </div>
                </>
              )
              const cls = 'flex items-center gap-3 p-4 rounded-2xl border border-line hover:border-primary/40 hover:bg-surface-2 transition active:scale-[0.99]'
              return a.to ? <Link key={a.title} to={a.to} className={cls}>{inner}</Link> : <button key={a.title} onClick={a.onClick} className={cls}>{inner}</button>
            })}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 anim-rise">
        <div>
          <p className="text-sm text-muted font-medium">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{greeting()}{settings.name ? `, ${settings.name}` : ''}</h1>
        </div>
        <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'all', label: 'All spending' }, { value: 'daily', label: 'Daily only' }]} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 shadow-pop anim-rise">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-24 size-56 rounded-full bg-fuchsia-400/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Spent in {fmtMonth(monthKey(today()), true)}</p>
              {data.change !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/15 rounded-full px-2.5 py-1">
                  {data.change > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {Math.abs(data.change).toFixed(0)}% vs last month
                </span>
              )}
            </div>
            <p className="num text-4xl sm:text-5xl font-extrabold tracking-tight mt-2">{money(data.monthSpent, cur)}</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/75 flex items-center gap-1"><ArrowDownLeft className="size-3.5" /> Income</p>
                <p className="num font-bold text-lg mt-0.5">{money(data.monthIncome, cur)}</p>
              </div>
              <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/75 flex items-center gap-1"><Wallet className="size-3.5" /> Net this month</p>
                <p className="num font-bold text-lg mt-0.5">{data.monthIncome - data.monthSpent < 0 ? '−' : ''}{money(Math.abs(data.monthIncome - data.monthSpent), cur)}</p>
              </div>
            </div>
            {budget > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-xs font-semibold text-white/85 mb-2">
                  <span>Daily budget {money(data.dailyMonthSpent, cur)} / {money(budget, cur)}</span>
                  <span>{budgetLeft >= 0 ? `${money(budgetLeft / data.daysLeft, cur)}/day left` : `${money(-budgetLeft, cur)} over`}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-[width] duration-700', budgetLeft < 0 ? 'bg-rose-300' : 'bg-white')} style={{ width: `${Math.min(100, (data.dailyMonthSpent / budget) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: 'Today', value: data.todaySpent, icon: CalendarDays, color: '#0ea5e9' },
            { label: 'This week', value: data.weekSpent, icon: ArrowUpRight, color: '#8b5cf6' },
            { label: 'You have to pay', value: data.owe, icon: HandCoins, color: '#e8890c', to: '/dues' },
            { label: 'You will receive', value: data.receive, icon: ArrowDownLeft, color: '#10a37f', to: '/dues?tab=receive' },
          ].map((s, i) => {
            const body = (
              <Card className={cn('p-4 h-full anim-rise', s.to && 'hover:border-primary/40 transition')} style={{ animationDelay: `${60 + i * 40}ms` }}>
                <IconBubble lucide={s.icon} color={s.color} size="sm" />
                <p className="text-xs text-muted font-medium mt-3">{s.label}</p>
                <p className="num text-lg sm:text-xl font-extrabold tracking-tight mt-0.5 truncate">{money(s.value, cur)}</p>
              </Card>
            )
            return s.to ? <Link key={s.label} to={s.to}>{body}</Link> : <div key={s.label}>{body}</div>
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 lg:hidden">
        {[
          { label: 'Expense', icon: ArrowUpRight, color: '#e5484d', onClick: () => openTx({ type: 'expense' }) },
          { label: 'To buy', icon: ShoppingBag, color: '#f97316', onClick: () => openForm({ kind: 'shop' }) },
          { label: 'Reminder', icon: BellPlus, color: '#5b5ef4', onClick: () => openForm({ kind: 'reminder' }) },
          { label: 'Contact', icon: Contact, color: '#14b8a6', onClick: () => openForm({ kind: 'contact' }) },
        ].map((a) => (
          <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surface border border-line active:scale-95 transition">
            <IconBubble lucide={a.icon} color={a.color} size="sm" />
            <span className="text-[11px] font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      {reminders.length > 0 && <NotificationSetup compact />}

      <ComingUp />

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader title="Cash flow" subtitle="Last 6 months" />
          <div className="flex-1 min-h-60 px-2 pb-4">
            <ResponsiveContainer>
              <AreaChart data={data.trend} margin={{ left: 0, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--income)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--income)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                <XAxis dataKey="key" tickFormatter={(k) => fmtMonth(k)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis tickFormatter={(v) => money(v, cur, true)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} />
                <Tooltip content={<ChartTooltip currency={cur} labelFormatter={(k) => fmtMonth(k, true)} />} cursor={{ stroke: 'var(--border)' }} />
                <Area type="monotone" dataKey="Income" stroke="var(--income)" strokeWidth={2.2} fill="url(#gInc)" />
                <Area type="monotone" dataKey="Expense" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Where it went" subtitle="This month by category" action={<Link to="/reports" className="text-xs font-semibold text-primary">Reports</Link>} />
          <div className="px-5 pb-5">
            {data.cats.length ? (
              <>
                <Donut data={data.cats.slice(0, 8)} currency={cur} centerLabel="Total" centerValue={money(data.monthSpent, cur, true)} height={170} />
                <div className="mt-4"><BreakdownList items={data.cats} total={data.monthSpent} currency={cur} limit={4} /></div>
              </>
            ) : (
              <EmptyState icon={PieIcon} title="Nothing spent yet" text="This month's expenses will appear here." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3 space-y-4 sm:space-y-5">
          <Card>
            <CardHeader title="Events & projects" subtitle={`${events.filter((e) => e.status === 'active').length} active`} action={<Link to="/events" className="text-xs font-semibold text-primary inline-flex items-center gap-1">All <ArrowRight className="size-3" /></Link>} />
            <div className="px-3 pb-3">
              {activeEvents.length ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {activeEvents.map((e) => {
                    const s = eventSummary(e, transactions, parties)
                    return (
                      <Link key={e.id} to={`/events/${e.id}`} className="rounded-2xl p-3.5 hover:bg-surface-2 transition border border-line">
                        <div className="flex items-center gap-3">
                          <IconBubble lucide={EVENT_KINDS[e.kind].icon} color={e.color} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{e.name}</p>
                            <p className="text-[11px] text-muted">{EVENT_KINDS[e.kind].label}</p>
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between mt-3 text-xs">
                          <span className="num font-bold text-sm">{money(s.spent, cur)}</span>
                          <span className="text-muted">{e.budget ? `of ${money(e.budget, cur, true)}` : 'spent'}</span>
                        </div>
                        {e.budget > 0 && <Progress value={s.budgetPct} color={e.color} className="mt-2 h-1.5" />}
                        {s.payDue > 0 && <p className="text-[11px] font-semibold text-due mt-2">{money(s.payDue, cur)} still to pay</p>}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={CalendarHeart} title="No active events" text="Building a home or planning a wedding? Track it as an event." action={<Link to="/events?new=1"><Button size="sm" icon={Plus}>New event</Button></Link>} />
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Recent transactions" action={<Link to="/transactions" className="text-xs font-semibold text-primary inline-flex items-center gap-1">View all <ArrowRight className="size-3" /></Link>} />
            <div className="px-2 pb-3">
              {transactions.length ? <TransactionList txs={transactions} pageSize={8} grouped={false} paginate={false} /> : <EmptyState icon={Wallet} title="No transactions" action={<Button size="sm" icon={Plus} onClick={() => openTx()}>Add one</Button>} />}
              {transactions.length > 8 && <Link to="/transactions" className="block text-center text-xs font-semibold text-primary pt-2 pb-1">See all {transactions.length} transactions</Link>}
            </div>
          </Card>
        </div>
        <Card className="lg:col-span-2 self-start">
          <CardHeader title="Pending payments" subtitle="Who you still have to pay" action={<Link to="/dues" className="text-xs font-semibold text-primary inline-flex items-center gap-1">All dues <ArrowRight className="size-3" /></Link>} />
          <div className="px-3 pb-3">
            {data.dues.length ? (
              <div className="space-y-1">
                {data.dues.map(({ p, s, ev }) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition">
                    <span className="grid place-items-center size-9 rounded-full text-xs font-bold text-white shrink-0" style={{ background: ev?.color ?? '#64748b' }}>{p.name.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">{ev && <Badge color={ev.color} className="max-w-32 truncate">{ev.name}</Badge>}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="num text-sm font-bold text-due">{money(s.due, cur)}</p>
                      <button onClick={() => openTx({ type: 'expense', eventId: p.eventId, partyId: p.id, categoryId: p.categoryId, amount: s.due })} className="text-[11px] font-bold text-primary hover:underline">Pay now</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={HandCoins} title="All settled" text="Add people & vendors inside an event to track what you owe them." />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
