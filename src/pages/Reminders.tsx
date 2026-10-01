import { useMemo, useState } from 'react'
import { Bell, BellOff, BellRing, CalendarPlus, ChevronDown, Plus, Share, Smartphone } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { isIOS, isStandalone, notifPermission, requestNotifPermission, showNotification } from '../lib/notify'
import type { PermissionState } from '../lib/notify'
import { ReminderCard, reminderState } from '../components/Reminders'
import { Button, Card, cn, EmptyState, PageHeader, Select } from '../components/ui'

export function NotificationSetup({ compact = false }: { compact?: boolean }) {
  const toast = useUI((s) => s.toast)
  const [perm, setPerm] = useState<PermissionState>(notifPermission())
  const iosNeedsInstall = isIOS() && !isStandalone()

  const enable = async () => {
    const p = await requestNotifPermission()
    setPerm(p)
    if (p === 'granted') {
      await showNotification('🔔 Notifications are on', 'Spendly will remind you about payments, shopping and events.', '/reminders', 'test')
      toast('Notifications enabled')
    } else if (p === 'denied') toast('Notifications blocked — allow them in browser settings', 'error')
  }

  if (perm === 'granted' && compact) return null

  return (
    <Card className={cn('p-4 sm:p-5 overflow-hidden relative', perm === 'granted' ? '' : 'border-primary/30')}>
      {perm !== 'granted' && <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />}
      <div className="relative flex items-start gap-3">
        <span className={cn('grid place-items-center size-10 rounded-xl shrink-0', perm === 'granted' ? 'bg-income/12 text-income' : perm === 'denied' ? 'bg-expense/12 text-expense' : 'bg-primary-soft text-primary')}>
          {perm === 'granted' ? <BellRing className="size-5" /> : perm === 'denied' ? <BellOff className="size-5" /> : <Bell className="size-5" />}
        </span>
        <div className="flex-1 min-w-0">
          {iosNeedsInstall ? (
            <>
              <p className="font-bold text-sm">Install Spendly to get notifications on iPhone</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">Tap <Share className="size-3.5 inline -mt-0.5" /> Share in Safari → <b>Add to Home Screen</b>, then open Spendly from your home screen and turn on notifications here.</p>
            </>
          ) : perm === 'unsupported' ? (
            <>
              <p className="font-bold text-sm">This browser can't show notifications</p>
              <p className="text-xs text-muted mt-1">Use Chrome, Edge or Safari, or add reminders to your phone calendar from each reminder's ⋯ menu.</p>
            </>
          ) : perm === 'denied' ? (
            <>
              <p className="font-bold text-sm">Notifications are blocked</p>
              <p className="text-xs text-muted mt-1">Open the site settings (lock icon next to the address) → Notifications → Allow, then reload.</p>
            </>
          ) : perm === 'granted' ? (
            <>
              <p className="font-bold text-sm">Notifications are on</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">Alerts arrive while Spendly is open or running in the background (install it to your home screen for best results). For alerts even when the app is fully closed, use <CalendarPlus className="size-3.5 inline -mt-0.5" /> Add to calendar from a reminder's ⋯ menu.</p>
            </>
          ) : (
            <>
              <p className="font-bold text-sm">Turn on notifications</p>
              <p className="text-xs text-muted mt-1">Get alerted for payments, shopping and event reminders — so nothing is forgotten before the wedding.</p>
            </>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {perm === 'default' && !iosNeedsInstall && <Button size="sm" icon={Bell} onClick={enable}>Enable notifications</Button>}
            {perm === 'granted' && <Button size="sm" variant="secondary" icon={BellRing} onClick={() => showNotification('🔔 Test notification', 'This is how Spendly reminders look.', '/reminders', 'test')}>Send test</Button>}
            {!isStandalone() && !isIOS() && <span className="inline-flex items-center gap-1.5 text-[11px] text-muted"><Smartphone className="size-3.5" /> Tip: browser menu → Install app / Add to Home screen</span>}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Reminders() {
  const { reminders, events } = useStore()
  const openForm = useUI((s) => s.openForm)
  const [ev, setEv] = useState('')
  const [showDone, setShowDone] = useState(false)

  const sections = useMemo(() => {
    const list = reminders.filter((r) => !ev || r.eventId === ev).sort((a, b) => a.at.localeCompare(b.at))
    return {
      due: list.filter((r) => reminderState(r) === 'due'),
      today: list.filter((r) => reminderState(r) === 'today'),
      upcoming: list.filter((r) => reminderState(r) === 'upcoming'),
      done: list.filter((r) => r.done).reverse(),
    }
  }, [reminders, ev])

  const block = (title: string, items: typeof reminders, color?: string) =>
    items.length > 0 && (
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider px-1 mb-2" style={{ color: color ?? 'var(--muted)' }}>{title} <span className="text-muted">· {items.length}</span></h3>
        <div className="grid lg:grid-cols-2 gap-2.5">{items.map((r) => <ReminderCard key={r.id} r={r} />)}</div>
      </section>
    )

  return (
    <div>
      <PageHeader title="Reminders" subtitle="Payments, shopping, calls — get notified at the right time" actions={<Button icon={Plus} onClick={() => openForm({ kind: 'reminder', preset: ev ? { eventId: ev } : undefined })}>New</Button>} />
      <div className="mb-5"><NotificationSetup /></div>

      {events.length > 0 && reminders.length > 0 && (
        <div className="max-w-xs mb-5">
          <Select value={ev} onChange={(e) => setEv(e.target.value)} className="bg-surface border-line">
            <option value="">All reminders</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
      )}

      {reminders.length === 0 ? (
        <Card>
          <EmptyState icon={BellRing} title="No reminders yet" text="Set reminders for vendor payments, things to buy, calls to make, bills — with repeat options like every week or every month." action={<Button icon={Plus} onClick={() => openForm({ kind: 'reminder' })}>New reminder</Button>} />
        </Card>
      ) : (
        <div className="space-y-6">
          {block('Due now', sections.due, 'var(--expense)')}
          {block('Later today', sections.today, 'var(--due)')}
          {block('Upcoming', sections.upcoming)}
          {!sections.due.length && !sections.today.length && !sections.upcoming.length && <Card><EmptyState icon={BellRing} title="All caught up 🎉" text="No pending reminders." /></Card>}
          {sections.done.length > 0 && (
            <section>
              <button onClick={() => setShowDone((v) => !v)} className="text-xs font-bold uppercase tracking-wider px-1 mb-2 text-muted inline-flex items-center gap-1">
                Done · {sections.done.length} <ChevronDown className={cn('size-3.5 transition', showDone && 'rotate-180')} />
              </button>
              {showDone && <div className="grid lg:grid-cols-2 gap-2.5">{sections.done.map((r) => <ReminderCard key={r.id} r={r} />)}</div>}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
