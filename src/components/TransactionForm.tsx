import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { EVENT_SUGGESTED_CATEGORIES } from '../lib/defaults'
import { categoryIcon, PAY_METHODS } from '../lib/icons'
import { money, today } from '../lib/format'
import { partySummary } from '../lib/selectors'
import type { PayMethod, TxType } from '../lib/types'
import { AmountInput, Button, cn, confirm, Field, Input, Modal, Segmented, Select, tint } from './ui'
import { PurposePicker } from './PurposePicker'

export function TransactionFormHost() {
  const open = useUI((s) => s.txOpen)
  return open ? <TransactionForm /> : null
}

function TransactionForm() {
  const { txEditing: editing, txPreset: preset, closeTx, toast } = useUI()
  const { categories, events, parties, transactions, settings, addTx, updateTx, deleteTx, restoreTx } = useStore()
  const base = editing ?? preset ?? {}

  const [type, setType] = useState<TxType>(base.type ?? 'expense')
  const [amount, setAmount] = useState(base.amount ? String(base.amount) : '')
  const [categoryId, setCategoryId] = useState(base.categoryId ?? '')
  const [purposeId, setPurposeId] = useState<string | undefined>(base.purposeId ?? (base.partyId ? parties.find((p) => p.id === base.partyId)?.purposeId : undefined))
  const [date, setDate] = useState(base.date ?? today())
  const [method, setMethod] = useState<PayMethod>(base.method ?? 'upi')
  const [eventId, setEventId] = useState(base.eventId ?? '')
  const [partyId, setPartyId] = useState(base.partyId ?? '')
  const [note, setNote] = useState(base.note ?? '')
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  const event = events.find((e) => e.id === eventId)
  const eventParties = parties.filter((p) => p.eventId === eventId)
  const party = parties.find((p) => p.id === partyId)
  const partyInfo = party ? partySummary(party, transactions.filter((t) => t.id !== editing?.id)) : undefined

  const cats = useMemo(() => {
    const list = categories.filter((c) => c.type === type)
    if (!event) return list
    const sugg = EVENT_SUGGESTED_CATEGORIES[event.kind] ?? []
    return [...list].sort((a, b) => {
      const ia = sugg.indexOf(a.id)
      const ib = sugg.indexOf(b.id)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  }, [categories, type, event])

  const visibleCats = showAll ? cats : cats.slice(0, 7)
  const selectedHidden = categoryId && !visibleCats.some((c) => c.id === categoryId) ? cats.find((c) => c.id === categoryId) : undefined

  const changeType = (t: TxType) => {
    setType(t)
    if (categories.find((c) => c.id === categoryId)?.type !== t) { setCategoryId(''); setPurposeId(undefined) }
    if (party && (party.direction === 'pay') !== (t === 'expense')) setPartyId('')
  }

  const changeParty = (id: string) => {
    setPartyId(id)
    const p = parties.find((x) => x.id === id)
    if (!p) return
    const t: TxType = p.direction === 'pay' ? 'expense' : 'income'
    setType(t)
    if (p.categoryId && categories.some((c) => c.id === p.categoryId && c.type === t)) { setCategoryId(p.categoryId); setPurposeId(p.purposeId) }
    else if (categories.find((c) => c.id === categoryId)?.type !== t) { setCategoryId(''); setPurposeId(undefined) }
    if (!amount) {
      const due = partySummary(p, transactions.filter((t) => t.id !== editing?.id)).due
      if (due > 0) setAmount(String(due))
    }
  }

  const save = (again = false) => {
    const value = parseFloat(amount)
    if (!value || value <= 0) return setError('Enter an amount greater than zero.')
    if (!categoryId) return setError('Pick a category.')
    const validPurpose = categories.find((c) => c.id === categoryId)?.purposes.some((p) => p.id === purposeId) ? purposeId : undefined
    const data = { type, amount: Math.round(value * 100) / 100, categoryId, purposeId: validPurpose, date, method, note: note.trim(), eventId: eventId || undefined, partyId: partyId || undefined }
    if (editing) {
      updateTx(editing.id, data)
      toast('Transaction updated')
      closeTx()
      return
    }
    const tx = addTx(data)
    toast(type === 'expense' ? `Expense of ${money(data.amount, settings.currency)} added` : `Income of ${money(data.amount, settings.currency)} added`, 'success', { label: 'Undo', onClick: () => deleteTx(tx.id) })
    if (again) {
      setAmount('')
      setNote('')
      setPartyId('')
      setError('')
    } else closeTx()
  }

  const remove = async () => {
    if (!editing) return
    const { ok } = await confirm({ title: 'Delete transaction?', message: 'This entry will be removed from all totals and reports.' })
    if (!ok) return
    deleteTx(editing.id)
    closeTx()
    toast('Transaction deleted', 'info', { label: 'Undo', onClick: () => restoreTx(editing) })
  }

  return (
    <Modal
      open
      onClose={closeTx}
      title={editing ? 'Edit transaction' : type === 'expense' ? 'Add expense' : 'Add income'}
      subtitle={event ? `In ${event.name}` : 'Daily spending, bills, event payments — anything'}
      footer={
        <>
          {editing ? (
            <Button variant="ghost" icon={Trash2} onClick={remove} className="text-expense hover:text-expense">Delete</Button>
          ) : (
            <Button variant="secondary" onClick={() => save(true)} className="max-sm:hidden">Save & add another</Button>
          )}
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-32" size="lg" onClick={() => save()}>
            {editing ? 'Save changes' : 'Save'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Segmented
          className="w-full"
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: <><ArrowUpRight className="size-4 text-expense" /> Expense</> },
            { value: 'income', label: <><ArrowDownLeft className="size-4 text-income" /> Income / Received</> },
          ]}
        />

        <div>
          <AmountInput value={amount} onChange={(v) => { setAmount(v); setError('') }} currency={settings.currency} autoFocus tone={type === 'income' ? 'income' : 'expense'} />
          {partyInfo && party && (
            <p className="text-xs text-muted mt-2 px-1">
              {party.direction === 'pay' ? 'Paid' : 'Received'} {money(partyInfo.settled, settings.currency)} of {money(party.agreedAmount, settings.currency)} ·{' '}
              <span className="font-semibold text-due">{money(partyInfo.due, settings.currency)} remaining</span>
            </p>
          )}
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Category</span>
          <div className="grid grid-cols-4 gap-2">
            {[...visibleCats, ...(selectedHidden ? [selectedHidden] : [])].map((c) => {
              const Icon = categoryIcon(c.icon)
              const active = c.id === categoryId
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => { if (c.id !== categoryId) setPurposeId(undefined); setCategoryId(c.id); setError('') }}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-[11px] font-semibold leading-tight text-center border transition active:scale-95', active ? 'border-transparent' : 'border-line hover:bg-surface-2 text-muted')}
                  style={active ? { background: tint(c.color, 0.14), color: c.color, boxShadow: `inset 0 0 0 1.5px ${c.color}` } : undefined}
                >
                  <span className="grid place-items-center size-8 rounded-lg" style={{ background: tint(c.color, active ? 0.2 : 0.12), color: c.color }}>
                    <Icon className="size-4" strokeWidth={2.2} />
                  </span>
                  <span className="line-clamp-2">{c.name}</span>
                </button>
              )
            })}
            {cats.length > 7 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="rounded-xl p-2.5 text-[11px] font-semibold border border-dashed border-line text-primary hover:bg-primary-soft transition">
                {showAll ? 'Show less' : `+${cats.length - 7} more`}
              </button>
            )}
          </div>
        </div>

        <PurposePicker category={categories.find((c) => c.id === categoryId)} value={purposeId} onChange={setPurposeId} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value || today())} />
          </Field>
          <Field label="Note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'expense' ? 'e.g. Vegetables' : 'e.g. Salary'} />
          </Field>
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Paid via</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PAY_METHODS) as PayMethod[]).map((m) => {
              const { label, icon: Icon } = PAY_METHODS[m]
              return (
                <button type="button" key={m} onClick={() => setMethod(m)} className={cn('h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition', method === m ? 'bg-primary text-white border-primary' : 'border-line text-muted hover:bg-surface-2')}>
                  <Icon className="size-3.5" /> {label}
                </button>
              )
            })}
          </div>
        </div>

        {events.length > 0 && (
          <div className="rounded-2xl bg-surface-2/60 border border-line p-3.5 space-y-3">
            <p className="text-xs font-semibold text-muted">Link to an event (optional)</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setPartyId('') }} className="bg-surface">
                <option value="">No event — daily expense</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
              {eventId && (
                <Select value={partyId} onChange={(e) => changeParty(e.target.value)} className="bg-surface" disabled={!eventParties.length}>
                  <option value="">{eventParties.length ? 'No person / vendor' : 'No people added yet'}</option>
                  {eventParties.map((p) => <option key={p.id} value={p.id}>{p.name} {p.role ? `· ${p.role}` : ''}</option>)}
                </Select>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-expense">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
