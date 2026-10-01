import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, HandCoins } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { money, sum } from '../lib/format'
import { partySummary } from '../lib/selectors'
import { EVENT_KINDS } from '../lib/icons'
import { Badge, Button, Card, cn, EmptyState, IconBubble, PageHeader, Progress, Segmented, tint } from '../components/ui'

export default function Dues() {
  const { parties, events, transactions, settings } = useStore()
  const openTx = useUI((s) => s.openTx)
  const cur = settings.currency
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'receive' ? 'receive' : 'pay'
  const [showSettled, setShowSettled] = useState(false)

  const rows = useMemo(() => parties.map((p) => ({ p, s: partySummary(p, transactions), ev: events.find((e) => e.id === p.eventId) })), [parties, transactions, events])
  const pay = rows.filter((r) => r.p.direction === 'pay')
  const rec = rows.filter((r) => r.p.direction === 'receive')
  const list = (tab === 'pay' ? pay : rec).filter((r) => showSettled || r.s.due > 0)

  const groups = useMemo(() => {
    const m = new Map<string, typeof list>()
    for (const r of [...list].sort((a, b) => b.s.due - a.s.due)) {
      const k = r.p.eventId
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.entries()].map(([id, items]) => ({ ev: events.find((e) => e.id === id), items, due: sum(items, (i) => i.s.due) })).sort((a, b) => b.due - a.due)
  }, [list, events])

  const totals = (r: typeof rows) => ({ due: sum(r, (x) => x.s.due), agreed: sum(r, (x) => x.p.agreedAmount), done: sum(r, (x) => x.s.settled), count: r.filter((x) => x.s.due > 0).length })
  const tp = totals(pay)
  const tr = totals(rec)

  return (
    <div>
      <PageHeader title="Dues & Payments" subtitle="Who you have to pay, how much you've already given, and what's left — across every event" />

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {[
          { key: 'pay', title: 'You have to pay', icon: ArrowUpRight, color: '#e8890c', t: tp, verb: 'given' },
          { key: 'receive', title: 'You will receive', icon: ArrowDownLeft, color: '#10a37f', t: tr, verb: 'received' },
        ].map((x) => (
          <button key={x.key} onClick={() => setParams(x.key === 'pay' ? {} : { tab: 'receive' }, { replace: true })} className="text-left">
            <Card className={cn('p-5 transition', tab === x.key ? 'ring-2' : 'opacity-80 hover:opacity-100')} style={tab === x.key ? { ['--tw-ring-color' as string]: x.color } : undefined}>
              <div className="flex items-center gap-3">
                <IconBubble lucide={x.icon} color={x.color} />
                <div>
                  <p className="text-sm font-bold">{x.title}</p>
                  <p className="text-xs text-muted">{x.t.count} pending</p>
                </div>
              </div>
              <p className="num text-3xl font-extrabold tracking-tight mt-4" style={{ color: x.color }}>{money(x.t.due, cur)}</p>
              <Progress value={x.t.agreed ? (x.t.done / x.t.agreed) * 100 : 0} color={x.color} warn={false} className="mt-3" />
              <p className="num text-xs text-muted mt-2">{money(x.t.done, cur)} {x.verb} of {money(x.t.agreed, cur)} total</p>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <Segmented size="sm" value={showSettled ? 'all' : 'pending'} onChange={(v) => setShowSettled(v === 'all')} options={[{ value: 'pending', label: 'Pending only' }, { value: 'all', label: 'Include settled' }]} />
      </div>

      {groups.length ? (
        <div className="space-y-4">
          {groups.map(({ ev, items, due }) => (
            <Card key={ev?.id ?? 'x'} className="overflow-hidden">
              <Link to={ev ? `/events/${ev.id}` : '/events'} className="flex items-center gap-3 px-5 py-3.5 border-b border-line hover:bg-surface-2 transition" style={{ background: ev ? tint(ev.color, 0.06) : undefined }}>
                {ev && <IconBubble lucide={EVENT_KINDS[ev.kind].icon} color={ev.color} size="sm" />}
                <p className="font-bold text-sm flex-1 truncate">{ev?.name ?? 'Unknown event'}</p>
                <p className="num text-sm font-bold" style={{ color: tab === 'pay' ? 'var(--due)' : 'var(--income)' }}>{money(due, cur)}</p>
              </Link>
              <div className="divide-y divide-line">
                {items.map(({ p, s }) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        {s.due === 0 && <Badge color="#10a37f"><CheckCircle2 className="size-3" /> Settled</Badge>}
                      </div>
                      <p className="text-xs text-muted truncate">{p.role}</p>
                      <div className="flex items-center gap-2 mt-2 max-w-xs">
                        <Progress value={s.progress} color={s.due === 0 ? 'var(--income)' : ev?.color} warn={false} className="h-1.5 flex-1" />
                        <span className="num text-[11px] text-muted">{s.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="num text-sm font-bold">{money(s.due, cur)}</p>
                      <p className="num text-[11px] text-muted">{money(s.settled, cur)} / {money(p.agreedAmount, cur)}</p>
                    </div>
                    {s.due > 0 && (
                      <Button size="sm" variant="soft" onClick={() => openTx({ type: tab === 'pay' ? 'expense' : 'income', eventId: p.eventId, partyId: p.id, categoryId: p.categoryId, amount: s.due })} className="max-sm:hidden">
                        {tab === 'pay' ? 'Pay' : 'Receive'}
                      </Button>
                    )}
                    {s.due > 0 && (
                      <button onClick={() => openTx({ type: tab === 'pay' ? 'expense' : 'income', eventId: p.eventId, partyId: p.id, categoryId: p.categoryId, amount: s.due })} className="sm:hidden grid place-items-center size-9 rounded-xl bg-primary-soft text-primary" aria-label="Record payment">
                        <HandCoins className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={parties.length ? 'Nothing pending here 🎉' : 'No dues tracked yet'}
            text={parties.length ? 'Everyone in this list is fully settled.' : 'Open an event and add people or vendors with the amount agreed. Every payment you record will update what\'s left.'}
            action={!parties.length && <Link to={events.length ? `/events/${events[0].id}` : '/events?new=1'}><Button>{events.length ? 'Open an event' : 'Create an event'}</Button></Link>}
          />
        </Card>
      )}
    </div>
  )
}
