import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarHeart, Plus, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { EVENT_KINDS } from '../lib/icons'
import { fmtDate, money } from '../lib/format'
import { eventSummary } from '../lib/selectors'
import { EventForm } from '../components/EventForm'
import { Badge, Button, Card, EmptyState, IconBubble, PageHeader, Progress, Segmented, tint } from '../components/ui'

export default function Events() {
  const { events, transactions, parties, settings } = useStore()
  const cur = settings.currency
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active')
  const creating = params.get('new') === '1'
  const setCreating = (v: boolean) => setParams(v ? { new: '1' } : {}, { replace: true })

  const list = events
    .filter((e) => tab === 'all' || e.status === tab)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))

  return (
    <div>
      <PageHeader title="Events & Projects" subtitle="Home construction, weddings, trips — each with its own budget, people and payments" actions={<Button icon={Plus} onClick={() => setCreating(true)}>New event</Button>} />

      {events.length > 0 && (
        <Segmented className="mb-5" value={tab} onChange={setTab} options={[
          { value: 'active', label: `Active (${events.filter((e) => e.status === 'active').length})` },
          { value: 'completed', label: `Completed (${events.filter((e) => e.status === 'completed').length})` },
          { value: 'all', label: 'All' },
        ]} />
      )}

      {list.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((e, i) => {
            const s = eventSummary(e, transactions, parties)
            const K = EVENT_KINDS[e.kind]
            return (
              <Link key={e.id} to={`/events/${e.id}`} className="group anim-rise" style={{ animationDelay: `${i * 40}ms` }}>
                <Card className="overflow-hidden h-full transition group-hover:shadow-pop group-hover:-translate-y-0.5 duration-200">
                  <div className="h-1.5" style={{ background: e.color }} />
                  <div className="p-5" style={{ background: `linear-gradient(180deg, ${tint(e.color, 0.07)}, transparent 60%)` }}>
                    <div className="flex items-start gap-3">
                      <IconBubble lucide={K.icon} color={e.color} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{e.name}</p>
                        <p className="text-xs text-muted mt-0.5">{fmtDate(e.startDate)}{e.endDate ? ` – ${fmtDate(e.endDate)}` : ''}</p>
                      </div>
                      {e.status === 'completed' && <Badge>Done</Badge>}
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">Spent</p>
                        <p className="num text-2xl font-extrabold tracking-tight">{money(s.spent, cur)}</p>
                      </div>
                      {e.budget > 0 && <p className="text-xs text-muted pb-1">of {money(e.budget, cur)}</p>}
                    </div>
                    {e.budget > 0 && <Progress value={s.budgetPct} color={e.color} className="mt-3" />}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-surface-2 px-2.5 py-2">
                        <p className="text-muted">To pay</p>
                        <p className="num font-bold text-due truncate">{money(s.payDue, cur, true)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-2 px-2.5 py-2">
                        <p className="text-muted">Received</p>
                        <p className="num font-bold text-income truncate">{money(s.received, cur, true)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-2 px-2.5 py-2">
                        <p className="text-muted flex items-center gap-1"><Users className="size-3" /> People</p>
                        <p className="num font-bold">{s.parties.length}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={CalendarHeart}
            title={events.length ? `No ${tab} events` : 'Create your first event'}
            text="An event groups all spending for a big occasion. Add contractors, caterers or anyone you pay, and always know what's paid and what's left."
            action={<Button icon={Plus} onClick={() => setCreating(true)}>New event</Button>}
          />
        </Card>
      )}

      {creating && <EventForm onClose={() => setCreating(false)} onCreated={(e) => navigate(`/events/${e.id}`)} />}
    </div>
  )
}
