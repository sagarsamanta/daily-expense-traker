import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { EVENT_SUGGESTED_CATEGORIES } from '../lib/defaults'
import { today } from '../lib/format'
import type { EventItem, Party, PartyDirection } from '../lib/types'
import { AmountInput, Button, Field, Input, Modal, Segmented, Select, Textarea } from './ui'
import { PurposePicker } from './PurposePicker'

export function PartyForm({ event, editing, onClose }: { event: EventItem; editing?: Party; onClose: () => void }) {
  const { addParty, updateParty, addTx, categories, settings } = useStore()
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState(editing?.name ?? '')
  const [role, setRole] = useState(editing?.role ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [direction, setDirection] = useState<PartyDirection>(editing?.direction ?? 'pay')
  const [agreed, setAgreed] = useState(editing?.agreedAmount ? String(editing.agreedAmount) : '')
  const [already, setAlready] = useState('')
  const sugg = EVENT_SUGGESTED_CATEGORIES[event.kind] ?? []
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? (direction === 'pay' ? sugg[0] : 'loan') ?? '')
  const [purposeId, setPurposeId] = useState<string | undefined>(editing?.purposeId)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState('')

  const type = direction === 'pay' ? 'expense' : 'income'
  const cats = categories.filter((c) => c.type === type).sort((a, b) => {
    const ia = sugg.indexOf(a.id)
    const ib = sugg.indexOf(b.id)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  const changeDirection = (d: PartyDirection) => {
    setDirection(d)
    const t = d === 'pay' ? 'expense' : 'income'
    if (categories.find((c) => c.id === categoryId)?.type !== t) setCategoryId(categories.find((c) => c.type === t && (d === 'pay' ? sugg.includes(c.id) : c.id === 'loan'))?.id ?? '')
  }

  const save = () => {
    if (!name.trim()) return setError('Enter a name.')
    const data = { eventId: event.id, name: name.trim(), role: role.trim(), phone: phone.trim(), direction, agreedAmount: parseFloat(agreed) || 0, categoryId: categoryId || undefined, purposeId: categories.find((c) => c.id === categoryId)?.purposes.some((x) => x.id === purposeId) ? purposeId : undefined, notes: notes.trim() }
    if (editing) {
      updateParty(editing.id, data)
      toast('Details updated')
    } else {
      const p = addParty(data)
      const paid = parseFloat(already)
      if (paid > 0)
        addTx({ type, amount: paid, date: today(), categoryId: categoryId || (type === 'expense' ? 'other' : 'other-income'), purposeId: data.purposeId, note: direction === 'pay' ? 'Advance paid' : 'Amount received', method: 'cash', eventId: event.id, partyId: p.id })
      toast(`${p.name} added`)
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit person / vendor' : 'Add person or vendor'}
      subtitle={`${event.name} — track what's agreed, what's paid, what's left`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-32" size="lg" onClick={save}>{editing ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Segmented
          className="w-full"
          value={direction}
          onChange={changeDirection}
          options={[
            { value: 'pay', label: <><ArrowUpRight className="size-4 text-expense" /> I have to pay</> },
            { value: 'receive', label: <><ArrowDownLeft className="size-4 text-income" /> I will receive</> },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" className="col-span-2 sm:col-span-1">
            <Input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={direction === 'pay' ? 'e.g. Ramesh Mistri' : 'e.g. Uncle Prakash'} autoFocus />
          </Field>
          <Field label="Role / work" className="col-span-2 sm:col-span-1">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={direction === 'pay' ? 'Mason, caterer, supplier…' : 'Loan, gift, share…'} />
          </Field>
        </div>
        <Field label={direction === 'pay' ? 'Total agreed amount (to give)' : 'Total amount to receive'} hint="Leave empty if not fixed yet — you can update it later.">
          <AmountInput value={agreed} onChange={setAgreed} currency={settings.currency} />
        </Field>
        {!editing && (
          <Field label={direction === 'pay' ? 'Already paid (optional)' : 'Already received (optional)'} hint="Recorded as one entry dated today. Add more payments any time.">
            <Input inputMode="decimal" value={already} onChange={(e) => setAlready(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Default category">
            <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPurposeId(undefined) }}>
              <option value="">None</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <PurposePicker category={categories.find((c) => c.id === categoryId)} value={purposeId} onChange={setPurposeId} />
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope of work, terms, bank details…" /></Field>
        {error && <p className="text-sm font-medium text-expense">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
