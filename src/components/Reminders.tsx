import { useState } from 'react'
import { AlarmClock, BellRing, CalendarPlus, Check, Clock, MoreHorizontal, Repeat as RepeatIcon, RotateCcw, ShoppingBag, Trash2, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { fmtDateTime, nowDT, relativeTime, toLocalDT, today } from '../lib/format'
import { downloadICS, googleCalendarHref, nextOccurrence, REPEAT_LABELS } from '../lib/notify'
import type { Reminder, Repeat } from '../lib/types'
import { PhoneActions } from './PhoneActions'
import { Badge, Button, Chip, cn, confirm, Field, IconButton, Input, Modal, Select, Textarea } from './ui'

const preset = (kind: 'hour' | 'evening' | 'tomorrow' | 'week') => {
  const d = new Date()
  if (kind === 'hour') d.setMinutes(d.getMinutes() + 60, 0, 0)
  if (kind === 'evening') { if (d.getHours() >= 19) d.setDate(d.getDate() + 1); d.setHours(19, 0, 0, 0) }
  if (kind === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0) }
  if (kind === 'week') { d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0) }
  return toLocalDT(d)
}

export function ReminderForm({ editing, preset: pre, onClose }: { editing?: Reminder; preset?: Partial<Reminder>; onClose: () => void }) {
  const { events, contacts, parties, shopItems, addReminder, updateReminder, deleteReminder } = useStore()
  const toast = useUI((s) => s.toast)
  const base = editing ?? pre ?? {}
  const [title, setTitle] = useState(base.title ?? '')
  const [note, setNote] = useState(base.note ?? '')
  const [at, setAt] = useState(base.at ?? preset('tomorrow'))
  const [repeat, setRepeat] = useState<Repeat>(base.repeat ?? 'none')
  const [eventId, setEventId] = useState(base.eventId ?? '')
  const [contactId, setContactId] = useState(base.contactId ?? '')
  const [error, setError] = useState('')
  const party = base.partyId ? parties.find((p) => p.id === base.partyId) : undefined
  const item = base.shopItemId ? shopItems.find((i) => i.id === base.shopItemId) : undefined

  const save = () => {
    if (!title.trim()) return setError('What should we remind you about?')
    const data = { title: title.trim(), note: note.trim(), at, repeat, eventId: eventId || undefined, contactId: contactId || undefined, partyId: base.partyId, shopItemId: base.shopItemId }
    if (editing) updateReminder(editing.id, { ...data, notified: editing.at === at ? editing.notified : undefined, done: editing.done && editing.at === at })
    else addReminder({ ...data, done: false })
    toast(`Reminder set for ${fmtDateTime(at)}`)
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    const { ok } = await confirm({ title: 'Delete reminder?' })
    if (!ok) return
    deleteReminder(editing.id)
    toast('Reminder deleted', 'info')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit reminder' : 'New reminder'}
      subtitle={party ? `For ${party.name}` : item ? `For ${item.name}` : 'We will notify you on this device at the time you pick'}
      footer={
        <>
          {editing && <Button variant="ghost" icon={Trash2} onClick={remove} className="text-expense hover:text-expense">Delete</Button>}
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-32" size="lg" onClick={save}>{editing ? 'Save' : 'Set reminder'}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label="Remind me to">
          <Input value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="e.g. Pay caterer advance, Buy saree" autoFocus={!editing} />
        </Field>
        <div>
          <span className="block text-xs font-semibold text-muted mb-2">When</span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap mb-3">
            {([['hour', 'In 1 hour'], ['evening', 'This evening'], ['tomorrow', 'Tomorrow 9 AM'], ['week', 'Next week']] as const).map(([k, l]) => (
              <Chip key={k} active={at === preset(k)} onClick={() => setAt(preset(k))}><Clock className="size-3.5" /> {l}</Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={at.slice(0, 10)} onChange={(e) => setAt(`${e.target.value || today()}T${at.slice(11)}`)} />
            <Input type="time" value={at.slice(11)} onChange={(e) => setAt(`${at.slice(0, 10)}T${e.target.value || '09:00'}`)} />
          </div>
          <p className="text-xs text-muted mt-1.5">{fmtDateTime(at)} · {relativeTime(at)}</p>
        </div>
        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Repeat</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => <Chip key={r} active={repeat === r} onClick={() => setRepeat(r)}>{REPEAT_LABELS[r]}</Chip>)}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {events.length > 0 && (
            <Field label="Event (optional)">
              <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">None</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
          )}
          {contacts.length > 0 && (
            <Field label="Person / shop to call (optional)">
              <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">None</option>
                {[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
        <Field label="Note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Amount, what to say, what to carry…" /></Field>
        {error && <p className="text-sm font-medium text-expense">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export const reminderState = (r: Reminder) => {
  if (r.done) return 'done'
  const now = nowDT()
  if (r.at <= now) return 'due'
  if (r.at.slice(0, 10) === now.slice(0, 10)) return 'today'
  return 'upcoming'
}

export function ReminderCard({ r, compact = false }: { r: Reminder; compact?: boolean }) {
  const { events, parties, contacts, shopItems, updateReminder } = useStore()
  const { openForm, toast } = useUI()
  const [menu, setMenu] = useState(false)
  const state = reminderState(r)
  const ev = r.eventId ? events.find((e) => e.id === r.eventId) : undefined
  const party = r.partyId ? parties.find((p) => p.id === r.partyId) : undefined
  const contact = r.contactId ? contacts.find((c) => c.id === r.contactId) : undefined
  const item = r.shopItemId ? shopItems.find((i) => i.id === r.shopItemId) : undefined
  const phone = contact?.phone || party?.phone || item?.shopPhone
  const color = state === 'due' ? 'var(--expense)' : state === 'today' ? 'var(--due)' : state === 'done' ? 'var(--income)' : 'var(--primary)'

  const done = () => {
    if (r.repeat !== 'none') {
      let next = nextOccurrence(r.at, r.repeat)
      while (next <= nowDT()) next = nextOccurrence(next, r.repeat)
      updateReminder(r.id, { at: next, notified: undefined })
      toast(`Done · next on ${fmtDateTime(next)}`)
    } else {
      updateReminder(r.id, { done: true })
      toast('Marked as done', 'success', { label: 'Undo', onClick: () => updateReminder(r.id, { done: false }) })
    }
  }
  const snooze = (mins: number) => {
    setMenu(false)
    const at = toLocalDT(new Date(Date.now() + mins * 60000))
    updateReminder(r.id, { at, notified: undefined, done: false })
    toast(`Snoozed to ${fmtDateTime(at)}`, 'info')
  }

  return (
    <div onClick={() => openForm({ kind: 'reminder', editing: r })} className={cn('relative flex items-start gap-3 p-3.5 rounded-2xl bg-surface border border-line cursor-pointer hover:border-primary/30 transition', state === 'done' && 'opacity-60')}>
      <span className="mt-0.5 grid place-items-center size-10 rounded-xl shrink-0" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        {state === 'done' ? <Check className="size-5" /> : state === 'due' ? <BellRing className="size-5" /> : <AlarmClock className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('font-semibold text-[15px] leading-snug', state === 'done' && 'line-through')}>{r.title}</p>
        <p className="text-xs mt-0.5 font-semibold" style={{ color }}>
          {fmtDateTime(r.at)} <span className="text-muted font-medium">· {state === 'done' ? 'done' : relativeTime(r.at)}</span>
        </p>
        {!compact && r.note && <p className="text-xs text-muted mt-1 line-clamp-2">{r.note}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {r.repeat !== 'none' && <Badge><RepeatIcon className="size-3" /> {REPEAT_LABELS[r.repeat]}</Badge>}
          {ev && <Badge color={ev.color} className="max-w-36 truncate">{ev.name}</Badge>}
          {(party || contact) && <Badge><User className="size-3" /> {party?.name ?? contact?.name}</Badge>}
          {item && <Badge><ShoppingBag className="size-3" /> {item.name}</Badge>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {state !== 'done' && (
            <button onClick={done} aria-label="Mark done" className="grid place-items-center size-9 rounded-xl bg-income/12 text-income active:scale-95 transition"><Check className="size-[18px]" strokeWidth={2.6} /></button>
          )}
          <IconButton icon={MoreHorizontal} label="More" onClick={() => setMenu((v) => !v)} />
        </div>
        {!compact && phone && <PhoneActions phone={phone} size="sm" />}
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenu(false) }} />
          <div className="absolute right-3 top-14 z-20 w-56 rounded-2xl border border-line bg-surface shadow-pop p-1.5 anim-pop" onClick={(e) => e.stopPropagation()}>
            {[
              { label: 'Snooze 10 minutes', icon: Clock, onClick: () => snooze(10) },
              { label: 'Snooze 1 hour', icon: Clock, onClick: () => snooze(60) },
              { label: 'Snooze to tomorrow', icon: Clock, onClick: () => snooze(24 * 60) },
              { label: 'Add to Google Calendar', icon: CalendarPlus, onClick: () => { setMenu(false); window.open(googleCalendarHref(r), '_blank') } },
              { label: 'Save to phone calendar (.ics)', icon: CalendarPlus, onClick: () => { setMenu(false); downloadICS(r) } },
              ...(r.done ? [{ label: 'Mark as not done', icon: RotateCcw, onClick: () => { setMenu(false); updateReminder(r.id, { done: false }) } }] : []),
            ].map((m) => (
              <button key={m.label} onClick={m.onClick} className="w-full flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm font-medium hover:bg-surface-2 text-left">
                <m.icon className="size-4 text-muted" /> {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
