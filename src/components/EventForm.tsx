import { useState } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { SWATCHES } from '../lib/defaults'
import { EVENT_KINDS } from '../lib/icons'
import { today } from '../lib/format'
import type { EventItem, EventKind } from '../lib/types'
import { AmountInput, Button, cn, Field, Input, Modal, Segmented, Textarea, tint } from './ui'

export function EventForm({ editing, onClose, onCreated }: { editing?: EventItem; onClose: () => void; onCreated?: (e: EventItem) => void }) {
  const { addEvent, updateEvent, settings } = useStore()
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState(editing?.name ?? '')
  const [kind, setKind] = useState<EventKind>(editing?.kind ?? 'home')
  const [budget, setBudget] = useState(editing?.budget ? String(editing.budget) : '')
  const [startDate, setStartDate] = useState(editing?.startDate ?? today())
  const [endDate, setEndDate] = useState(editing?.endDate ?? '')
  const [color, setColor] = useState(editing?.color ?? EVENT_KINDS.home.color)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [status, setStatus] = useState<EventItem['status']>(editing?.status ?? 'active')
  const [error, setError] = useState('')

  const pickKind = (k: EventKind) => {
    if (!editing || color === EVENT_KINDS[kind].color) setColor(EVENT_KINDS[k].color)
    setKind(k)
  }

  const save = () => {
    if (!name.trim()) return setError('Give your event a name.')
    const data = { name: name.trim(), kind, budget: parseFloat(budget) || 0, startDate, endDate: endDate || undefined, color, notes: notes.trim(), status }
    if (editing) {
      updateEvent(editing.id, data)
      toast('Event updated')
      onClose()
    } else {
      const ev = addEvent(data)
      toast('Event created')
      onClose()
      onCreated?.(ev)
    }
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={editing ? 'Edit event' : 'New event or project'}
      subtitle="Home building, wedding, trip, festival — track every rupee in one place"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-36" size="lg" onClick={save}>{editing ? 'Save changes' : 'Create event'}</Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Type</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => {
              const { label, icon: Icon, color: c } = EVENT_KINDS[k]
              const active = k === kind
              return (
                <button key={k} type="button" onClick={() => pickKind(k)} className={cn('flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border text-left transition active:scale-[0.98]', active ? 'border-transparent' : 'border-line hover:bg-surface-2 text-muted')} style={active ? { background: tint(c, 0.12), color: c, boxShadow: `inset 0 0 0 1.5px ${c}` } : undefined}>
                  <span className="grid place-items-center size-7 rounded-lg shrink-0" style={{ background: tint(c, 0.16), color: c }}><Icon className="size-4" /></span>
                  <span className="leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Name">
          <Input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={kind === 'home' ? 'e.g. New House Construction' : kind === 'wedding' ? "e.g. Riya's Wedding" : 'e.g. Goa Trip 2026'} autoFocus />
        </Field>

        <Field label="Total budget (optional)" hint="Set a budget to see how much is left as you spend.">
          <AmountInput value={budget} onChange={setBudget} currency={settings.currency} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value || today())} /></Field>
          <Field label="End date (optional)"><Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.concat(Object.values(EVENT_KINDS).map((k) => k.color)).filter((c, i, a) => a.indexOf(c) === i).map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className="grid place-items-center size-8 rounded-full transition hover:scale-110" style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}>
                {color === c && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, guest count, anything to remember…" /></Field>

        {editing && (
          <Field label="Status">
            <Segmented value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }]} />
          </Field>
        )}
        {error && <p className="text-sm font-medium text-expense">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
