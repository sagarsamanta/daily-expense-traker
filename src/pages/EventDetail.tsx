import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowLeft, BellPlus, BellRing, CheckCircle2, ChevronDown, Download, MoreHorizontal, Pencil, PieChart as PieIcon, Plus, RotateCcw, ShoppingBag, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { EVENT_KINDS } from '../lib/icons'
import { fmtDate, fmtMonth, money, monthKey, sum } from '../lib/format'
import { byCategory, byPurpose, eventSummary, partySummary, sortTx, txOfParty } from '../lib/selectors'
import { exportCSV } from '../lib/exporters'
import { initials } from '../lib/phone'
import type { Party } from '../lib/types'
import { BreakdownList, ChartTooltip, Donut } from '../components/charts'
import { EventForm } from '../components/EventForm'
import { PartyForm } from '../components/PartyForm'
import { TransactionList } from '../components/TransactionList'
import { PhoneActions } from '../components/PhoneActions'
import { ReminderCard } from '../components/Reminders'
import { ShoppingList } from './Shopping'
import { Badge, Button, Card, CardHeader, cn, confirm, EmptyState, IconBubble, IconButton, Progress, Segmented, tint } from '../components/ui'

type Tab = 'overview' | 'people' | 'shopping' | 'reminders' | 'transactions'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { events, transactions, parties, categories, settings, shopItems, reminders, updateEvent, deleteEvent } = useStore()
  const { openTx, openForm, toast } = useUI()
  const cur = settings.currency
  const event = events.find((e) => e.id === id)
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [partyForm, setPartyForm] = useState<{ editing?: Party } | null>(null)
  const [menu, setMenu] = useState(false)

  const s = useMemo(() => (event ? eventSummary(event, transactions, parties) : undefined), [event, transactions, parties])
  const [breakdown, setBreakdown] = useState<'purpose' | 'category'>('purpose')
  const cats = useMemo(() => (s ? (breakdown === 'purpose' ? byPurpose : byCategory)(s.txs.filter((t) => t.type === 'expense'), categories) : []), [s, categories, breakdown])
  const evShop = useMemo(() => shopItems.filter((i) => i.eventId === id), [shopItems, id])
  const evReminders = useMemo(() => reminders.filter((r) => r.eventId === id).sort((a, b) => Number(a.done) - Number(b.done) || a.at.localeCompare(b.at)), [reminders, id])
  const [shopStatus, setShopStatus] = useState<'pending' | 'bought' | 'all'>('pending')
  const [shopGroup, setShopGroup] = useState<'purpose' | 'shop' | 'date'>('purpose')
  const monthly = useMemo(() => {
    if (!s) return []
    const m = new Map<string, number>()
    for (const t of s.txs) if (t.type === 'expense') m.set(monthKey(t.date), (m.get(monthKey(t.date)) ?? 0) + t.amount)
    return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, Spent]) => ({ key, Spent }))
  }, [s])

  if (!event || !s) {
    return <Card><EmptyState icon={Wallet} title="Event not found" text="It may have been deleted." action={<Link to="/events"><Button variant="secondary">Back to events</Button></Link>} /></Card>
  }

  const K = EVENT_KINDS[event.kind]
  const addExpense = () => openTx({ type: 'expense', eventId: event.id })
  const remove = async () => {
    setMenu(false)
    const { ok, checked } = await confirm({
      title: `Delete "${event.name}"?`,
      message: `This removes the event and its ${s.parties.length} people/vendors. ${s.txs.length} linked transactions will be kept as daily entries unless you choose otherwise.`,
      checkbox: s.txs.length ? `Also delete all ${s.txs.length} transactions` : undefined,
    })
    if (!ok) return
    deleteEvent(event.id, checked)
    toast('Event deleted', 'info')
    navigate('/events')
  }

  return (
    <div>
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-4"><ArrowLeft className="size-4" /> Events</Link>

      <Card className="overflow-hidden mb-5 anim-rise">
        <div className="p-5 sm:p-7" style={{ background: `linear-gradient(135deg, ${tint(event.color, 0.16)}, ${tint(event.color, 0.02)} 70%)` }}>
          <div className="flex items-start gap-4">
            <IconBubble lucide={K.icon} color={event.color} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{event.name}</h1>
                {event.status === 'completed' && <Badge color="#10a37f">Completed</Badge>}
              </div>
              <p className="text-sm text-muted mt-0.5">{K.label} · {fmtDate(event.startDate)}{event.endDate ? ` – ${fmtDate(event.endDate)}` : ''}</p>
            </div>
            <div className="relative">
              <IconButton icon={MoreHorizontal} label="More" onClick={() => setMenu((v) => !v)} />
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-line bg-surface shadow-pop p-1.5 anim-pop">
                    {[
                      { icon: Pencil, label: 'Edit event', onClick: () => { setMenu(false); setEditing(true) } },
                      event.status === 'active'
                        ? { icon: CheckCircle2, label: 'Mark as completed', onClick: () => { setMenu(false); updateEvent(event.id, { status: 'completed' }); toast('Marked as completed') } }
                        : { icon: RotateCcw, label: 'Reopen event', onClick: () => { setMenu(false); updateEvent(event.id, { status: 'active' }) } },
                      { icon: Download, label: 'Export CSV', onClick: () => { setMenu(false); exportCSV({ transactions: s.txs, categories, events, parties }, `${event.name.replace(/\W+/g, '-').toLowerCase()}.csv`) } },
                      { icon: Trash2, label: 'Delete event', onClick: remove, danger: true },
                    ].map((m) => (
                      <button key={m.label} onClick={m.onClick} className={cn('w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium hover:bg-surface-2', 'danger' in m && m.danger ? 'text-expense' : 'text-ink')}>
                        <m.icon className="size-4" /> {m.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Total spent', value: s.spent, cls: 'text-ink' },
              { label: event.budget ? (s.remaining >= 0 ? 'Budget left' : 'Over budget') : 'Budget', value: event.budget ? Math.abs(s.remaining) : 0, cls: s.remaining < 0 ? 'text-expense' : 'text-ink', hide: !event.budget, alt: 'Not set' },
              { label: 'Still to pay', value: s.payDue, cls: 'text-due' },
              { label: 'Received', value: s.received, cls: 'text-income' },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl bg-surface/80 backdrop-blur border border-line px-4 py-3">
                <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">{x.label}</p>
                <p className={cn('num text-lg sm:text-xl font-extrabold tracking-tight mt-0.5 truncate', x.cls)}>{x.hide ? <span className="text-muted text-base">{x.alt}</span> : money(x.value, cur)}</p>
              </div>
            ))}
          </div>
          {event.budget > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-muted mb-1.5">
                <span>{s.budgetPct.toFixed(0)}% of {money(event.budget, cur)} budget used</span>
                {s.projected > s.spent && <span>Projected: {money(s.projected, cur)}</span>}
              </div>
              <Progress value={s.budgetPct} color={event.color} />
            </div>
          )}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-5">
            <Button icon={Plus} onClick={addExpense} className="col-span-2 sm:col-span-1" size="lg">Add expense</Button>
            <Button variant="secondary" icon={UserPlus} onClick={() => setPartyForm({})}>Person / vendor</Button>
            <Button variant="secondary" icon={ShoppingBag} onClick={() => openForm({ kind: 'shop', preset: { eventId: event.id } })}>To buy</Button>
            <Button variant="secondary" icon={BellPlus} onClick={() => openForm({ kind: 'reminder', preset: { eventId: event.id } })}>Reminder</Button>
            <Button variant="secondary" icon={ArrowDownLeft} onClick={() => openTx({ type: 'income', eventId: event.id })}>Received</Button>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto no-scrollbar mb-5">
        <Segmented<Tab> value={tab} onChange={setTab} options={[
          { value: 'overview', label: 'Overview' },
          { value: 'people', label: `People (${s.parties.length})` },
          { value: 'shopping', label: `To buy (${evShop.filter((i) => i.status === 'pending').length})` },
          { value: 'reminders', label: `Reminders (${evReminders.filter((r) => !r.done).length})` },
          { value: 'transactions', label: `Entries (${s.txs.length})` },
        ]} />
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Where the money went" action={<Segmented size="sm" value={breakdown} onChange={setBreakdown} options={[{ value: 'purpose', label: 'Purpose' }, { value: 'category', label: 'Category' }]} />} />
            <div className="px-5 pb-5">
              {cats.length ? (
                <>
                  <Donut data={cats.slice(0, 8)} currency={cur} centerLabel="Spent" centerValue={money(s.spent, cur, true)} height={180} />
                  <div className="mt-5"><BreakdownList items={cats} currency={cur} total={s.spent} limit={8} /></div>
                </>
              ) : <EmptyState icon={PieIcon} title="No spending yet" action={<Button size="sm" icon={Plus} onClick={addExpense}>Add expense</Button>} />}
            </div>
          </Card>
          <div className="lg:col-span-3 space-y-4 sm:space-y-5">
            <Card>
              <CardHeader title="Spending over time" subtitle="Per month" />
              <div className="h-56 px-2 pb-4">
                {monthly.length ? (
                  <ResponsiveContainer>
                    <BarChart data={monthly} margin={{ left: 0, right: 12, top: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="key" tickFormatter={(k) => fmtMonth(k)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                      <YAxis tickFormatter={(v) => money(v, cur, true)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} />
                      <Tooltip content={<ChartTooltip currency={cur} labelFormatter={(k) => fmtMonth(k, true)} />} cursor={{ fill: 'var(--surface-2)' }} />
                      <Bar dataKey="Spent" fill={event.color} radius={[8, 8, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted text-center pt-16">No data yet</p>}
              </div>
            </Card>
            <Card>
              <CardHeader title="Payment status" subtitle="People & vendors you have to pay" action={s.parties.length > 0 && <button onClick={() => setTab('people')} className="text-xs font-semibold text-primary">Manage</button>} />
              <div className="px-5 pb-5 space-y-3.5">
                {s.parties.filter((p) => p.direction === 'pay').slice(0, 6).map((p) => {
                  const ps = partySummary(p, transactions)
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-sm gap-3">
                        <span className="font-semibold truncate">{p.name} <span className="text-muted font-normal text-xs">{p.role}</span></span>
                        <span className="num text-xs text-muted shrink-0"><b className="text-ink">{money(ps.settled, cur)}</b> / {money(p.agreedAmount, cur)}</span>
                      </div>
                      <Progress value={ps.progress} color={ps.due === 0 ? 'var(--income)' : event.color} warn={false} className="mt-1.5 h-1.5" />
                    </div>
                  )
                })}
                {!s.parties.some((p) => p.direction === 'pay') && (
                  <EmptyState icon={Users} title="Track who you pay" text="Add a contractor, mason, caterer or shop with the agreed amount — every payment you log reduces what's due." action={<Button size="sm" icon={UserPlus} onClick={() => setPartyForm({})}>Add person</Button>} />
                )}
              </div>
            </Card>
            {event.notes && <Card className="p-5"><p className="text-xs font-semibold text-muted mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{event.notes}</p></Card>}
          </div>
        </div>
      )}

      {tab === 'people' && <PeopleTab parties={s.parties} onAdd={() => setPartyForm({})} onEdit={(p) => setPartyForm({ editing: p })} />}

      {tab === 'shopping' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Segmented size="sm" value={shopStatus} onChange={setShopStatus} options={[{ value: 'pending', label: 'To buy' }, { value: 'bought', label: 'Bought' }, { value: 'all', label: 'All' }]} />
            <div className="flex items-center gap-2">
              <Segmented size="sm" value={shopGroup} onChange={setShopGroup} options={[{ value: 'purpose', label: 'Purpose' }, { value: 'shop', label: 'Shop' }, { value: 'date', label: 'Date' }]} />
              <Button size="sm" variant="soft" icon={Plus} onClick={() => openForm({ kind: 'shop', preset: { eventId: event.id } })}>Add</Button>
            </div>
          </div>
          {evShop.filter((i) => shopStatus === 'all' || i.status === shopStatus).length ? (
            <ShoppingList items={evShop.filter((i) => shopStatus === 'all' || i.status === shopStatus)} group={shopGroup} showEvent={false} />
          ) : (
            <Card><EmptyState icon={ShoppingBag} title="Nothing to buy yet" text="List everything you need for this event — by purpose, with the shop and its number — and tick items off as you buy them." action={<Button size="sm" icon={Plus} onClick={() => openForm({ kind: 'shop', preset: { eventId: event.id } })}>Add item</Button>} /></Card>
          )}
        </div>
      )}

      {tab === 'reminders' && (
        <div>
          <div className="flex justify-end mb-4"><Button size="sm" variant="soft" icon={BellPlus} onClick={() => openForm({ kind: 'reminder', preset: { eventId: event.id } })}>New reminder</Button></div>
          {evReminders.length ? (
            <div className="grid lg:grid-cols-2 gap-2.5">{evReminders.map((r) => <ReminderCard key={r.id} r={r} />)}</div>
          ) : (
            <Card><EmptyState icon={BellRing} title="No reminders for this event" text="Payment dates, fittings, bookings, calls — set a reminder and get notified." action={<Button size="sm" icon={BellPlus} onClick={() => openForm({ kind: 'reminder', preset: { eventId: event.id } })}>New reminder</Button>} /></Card>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <Card className="p-2 sm:p-3">
          {s.txs.length ? <TransactionList txs={s.txs} showEvent={false} /> : <EmptyState icon={Wallet} title="No transactions yet" action={<Button size="sm" icon={Plus} onClick={addExpense}>Add expense</Button>} />}
        </Card>
      )}

      {editing && <EventForm editing={event} onClose={() => setEditing(false)} />}
      {partyForm && <PartyForm event={event} editing={partyForm.editing} onClose={() => setPartyForm(null)} />}
    </div>
  )
}

function PeopleTab({ parties, onAdd, onEdit }: { parties: Party[]; onAdd: () => void; onEdit: (p: Party) => void }) {
  const { transactions, settings } = useStore()
  const cur = settings.currency
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all')
  const rows = parties
    .map((p) => ({ p, s: partySummary(p, transactions) }))
    .filter(({ s }) => filter === 'all' || (filter === 'pending' ? s.due > 0 : s.due === 0))
    .sort((a, b) => b.s.due - a.s.due)
  const pay = parties.filter((p) => p.direction === 'pay').map((p) => ({ p, s: partySummary(p, transactions) }))
  const rec = parties.filter((p) => p.direction === 'receive').map((p) => ({ p, s: partySummary(p, transactions) }))

  if (!parties.length) {
    return <Card><EmptyState icon={Users} title="No people or vendors yet" text="Add everyone involved — contractor, mason, electrician, caterer, decorator, or a relative lending you money. Set the agreed amount, then log payments as you make them." action={<Button icon={UserPlus} onClick={onAdd}>Add person / vendor</Button>} /></Card>
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { title: 'You have to pay', list: pay, color: 'var(--due)', verb: 'Paid' },
          { title: 'You will receive', list: rec, color: 'var(--income)', verb: 'Received' },
        ].filter((x) => x.list.length).map((x) => {
          const agreed = sum(x.list, (r) => r.p.agreedAmount)
          const done = sum(x.list, (r) => r.s.settled)
          const due = sum(x.list, (r) => r.s.due)
          return (
            <Card key={x.title} className="p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold">{x.title}</p>
                <p className="num text-lg font-extrabold" style={{ color: x.color }}>{money(due, cur)}</p>
              </div>
              <Progress value={agreed ? (done / agreed) * 100 : 0} color={x.color} warn={false} className="mt-2.5" />
              <p className="text-xs text-muted mt-2 num">{x.verb} {money(done, cur)} of {money(agreed, cur)} agreed</p>
            </Card>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'settled', label: 'Settled' }]} />
        <Button size="sm" variant="soft" icon={UserPlus} onClick={onAdd}>Add</Button>
      </div>
      <div className="grid xl:grid-cols-2 gap-3 items-start">
        {rows.map(({ p, s }) => <PartyCard key={p.id} party={p} s={s} onEdit={() => onEdit(p)} />)}
        {!rows.length && <p className="text-sm text-muted text-center py-8 xl:col-span-2">Nothing here.</p>}
      </div>
    </div>
  )
}

function PartyCard({ party: p, s, onEdit }: { party: Party; s: ReturnType<typeof partySummary>; onEdit: () => void }) {
  const { transactions, events, settings, reminders, deleteParty } = useStore()
  const { openTx, editTx, openForm, toast } = useUI()
  const hasReminder = reminders.some((r) => r.partyId === p.id && !r.done)
  const cur = settings.currency
  const [open, setOpen] = useState(false)
  const ev = events.find((e) => e.id === p.eventId)
  const history = sortTx(txOfParty(p.id, transactions))
  const isPay = p.direction === 'pay'
  const settled = s.due === 0 && (p.agreedAmount > 0 || s.settled > 0)

  const record = () => openTx({ type: isPay ? 'expense' : 'income', eventId: p.eventId, partyId: p.id, categoryId: p.categoryId, amount: s.due || undefined })
  const remove = async () => {
    const { ok } = await confirm({ title: `Remove ${p.name}?`, message: `${history.length} payment${history.length === 1 ? '' : 's'} will stay in your transactions, just unlinked from this person.` })
    if (!ok) return
    deleteParty(p.id)
    toast(`${p.name} removed`, 'info')
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center size-11 rounded-2xl text-sm font-bold shrink-0" style={{ background: tint(ev?.color ?? '#64748b', 0.15), color: ev?.color }}>
            {initials(p.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold truncate">{p.name}</p>
              <Badge color={isPay ? '#e8890c' : '#10a37f'}>{isPay ? 'To pay' : 'To receive'}</Badge>
              {settled && <Badge color="#10a37f"><CheckCircle2 className="size-3" /> Settled</Badge>}
            </div>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
              {p.role && <span>{p.role}</span>}
              {p.phone && <span>{p.phone}</span>}
            </p>
          </div>
          <div className="flex items-center -mr-2 -mt-1">
            <IconButton icon={Pencil} label="Edit" onClick={onEdit} />
            <IconButton icon={Trash2} label="Remove" onClick={remove} className="hover:text-expense" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div><p className="text-[11px] text-muted font-semibold">Agreed</p><p className="num font-bold text-sm sm:text-base">{p.agreedAmount ? money(p.agreedAmount, cur) : '—'}</p></div>
          <div><p className="text-[11px] text-muted font-semibold">{isPay ? 'Paid' : 'Received'}</p><p className="num font-bold text-sm sm:text-base text-income">{money(s.settled, cur)}</p></div>
          <div><p className="text-[11px] text-muted font-semibold">{isPay ? 'Left to pay' : 'Left to get'}</p><p className={cn('num font-bold text-sm sm:text-base', s.due > 0 ? 'text-due' : 'text-muted')}>{money(s.due, cur)}</p></div>
        </div>
        {p.agreedAmount > 0 && <Progress value={s.progress} color={settled ? 'var(--income)' : ev?.color} warn={false} className="mt-3" />}
        {s.extra > 0 && <p className="text-xs text-expense font-medium mt-2">{isPay ? 'Paid' : 'Received'} {money(s.extra, cur)} more than agreed</p>}
        {p.notes && <p className="text-xs text-muted mt-3 whitespace-pre-wrap">{p.notes}</p>}

        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" icon={Plus} onClick={record}>{isPay ? 'Record payment' : 'Record received'}</Button>
          <Button size="sm" variant="soft" icon={hasReminder ? BellRing : BellPlus} onClick={() => openForm({ kind: 'reminder', preset: { title: `${isPay ? 'Pay' : 'Collect from'} ${p.name}`, note: s.due ? `${money(s.due, cur)} remaining` : '', eventId: p.eventId, partyId: p.id } })}>Remind</Button>
          <PhoneActions phone={p.phone} size="sm" className="ml-auto" />
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
              {history.length} {history.length === 1 ? 'entry' : 'entries'} <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} />
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-surface-2/50 px-4 sm:px-5 py-2 anim-fade">
          {history.map((t) => (
            <button key={t.id} onClick={() => editTx(t)} className="w-full flex items-center justify-between gap-3 py-2.5 text-sm border-b border-line last:border-0 text-left hover:opacity-80">
              <div className="min-w-0">
                <p className="font-medium truncate">{t.note || (isPay ? 'Payment' : 'Received')}</p>
                <p className="text-xs text-muted">{fmtDate(t.date)} · {t.method.toUpperCase()}</p>
              </div>
              <span className="num font-bold shrink-0">{money(t.amount, cur)}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
