import { useMemo, useState } from 'react'
import { BellRing, Check, Flag, Store, Trash2, Undo2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { EVENT_SUGGESTED_CATEGORIES } from '../lib/defaults'
import { PAY_METHODS } from '../lib/icons'
import { daysUntil, dueLabel, money, parseDate, toISODate, toLocalDT, today } from '../lib/format'
import { findPurpose } from '../lib/selectors'
import type { PayMethod, Priority, ShopItem } from '../lib/types'
import { PhoneActions } from './PhoneActions'
import { PurposePicker } from './PurposePicker'
import { AmountInput, Badge, Button, Chip, cn, confirm, Field, Input, Modal, Select, Textarea, Toggle } from './ui'

export const PRIORITY: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: '#e5484d' },
  medium: { label: 'Medium', color: '#e8890c' },
  low: { label: 'Low', color: '#64748b' },
}

const defaultRemindAt = (needBy?: string) => {
  const d = needBy ? parseDate(needBy) : new Date()
  if (needBy && daysUntil(needBy) > 0) d.setDate(d.getDate() - 1)
  else d.setDate(new Date().getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return toLocalDT(d)
}

export function ShopItemForm({ editing, preset, onClose }: { editing?: ShopItem; preset?: Partial<ShopItem>; onClose: () => void }) {
  const { categories, events, contacts, reminders, settings, addShopItem, updateShopItem, deleteShopItem, addContact, addReminder, updateReminder, deleteReminder } = useStore()
  const toast = useUI((s) => s.toast)
  const base = editing ?? preset ?? {}
  const linkedReminder = editing ? reminders.find((r) => r.shopItemId === editing.id && !r.done) : undefined

  const [name, setName] = useState(base.name ?? '')
  const [qty, setQty] = useState(base.qty ?? '')
  const [estimate, setEstimate] = useState(base.estimate ? String(base.estimate) : '')
  const [eventId, setEventId] = useState(base.eventId ?? '')
  const event = events.find((e) => e.id === eventId)
  const [categoryId, setCategoryId] = useState(base.categoryId ?? (event ? EVENT_SUGGESTED_CATEGORIES[event.kind][0] : ''))
  const [purposeId, setPurposeId] = useState<string | undefined>(base.purposeId)
  const [contactId, setContactId] = useState(base.contactId ?? (base.shopName ? 'custom' : ''))
  const [shopName, setShopName] = useState(base.shopName ?? '')
  const [shopPhone, setShopPhone] = useState(base.shopPhone ?? '')
  const [shopAddress, setShopAddress] = useState('')
  const [needBy, setNeedBy] = useState(base.needBy ?? '')
  const [priority, setPriority] = useState<Priority>(base.priority ?? 'medium')
  const [notes, setNotes] = useState(base.notes ?? '')
  const [remind, setRemind] = useState(!!linkedReminder)
  const [remindAt, setRemindAt] = useState(linkedReminder?.at ?? defaultRemindAt(base.needBy))
  const [error, setError] = useState('')

  const expenseCats = useMemo(() => {
    const list = categories.filter((c) => c.type === 'expense')
    const sugg = event ? EVENT_SUGGESTED_CATEGORIES[event.kind] : []
    return [...list].sort((a, b) => (sugg.indexOf(a.id) < 0 ? 99 : sugg.indexOf(a.id)) - (sugg.indexOf(b.id) < 0 ? 99 : sugg.indexOf(b.id)))
  }, [categories, event])
  const category = categories.find((c) => c.id === categoryId)

  const save = () => {
    if (!name.trim()) return setError('What do you need to buy?')
    let cid = contactId && contactId !== 'custom' && contactId !== 'new' ? contactId : undefined
    let sName = ''
    let sPhone = ''
    if (contactId === 'new' && shopName.trim()) {
      cid = addContact({ name: shopName.trim(), kind: 'shop', phone: shopPhone.trim(), altPhone: '', address: shopAddress.trim(), notes: '' }).id
    } else if (contactId === 'custom') {
      sName = shopName.trim()
      sPhone = shopPhone.trim()
    }
    const data = {
      name: name.trim(), qty: qty.trim(), estimate: parseFloat(estimate) || 0, categoryId: categoryId || undefined,
      purposeId: category?.purposes.some((p) => p.id === purposeId) ? purposeId : undefined,
      eventId: eventId || undefined, contactId: cid, shopName: sName, shopPhone: sPhone, needBy: needBy || undefined, priority, notes: notes.trim(),
    }
    let itemId = editing?.id
    if (editing) updateShopItem(editing.id, data)
    else itemId = addShopItem({ ...data, status: 'pending' }).id

    const title = `Buy ${data.name}${data.qty ? ` (${data.qty})` : ''}`
    const shop = cid ? contacts.find((c) => c.id === cid)?.name ?? shopName.trim() : sName
    const note = [shop && `From ${shop}`, data.estimate ? `Approx ${money(data.estimate, settings.currency)}` : ''].filter(Boolean).join(' · ')
    if (remind) {
      if (linkedReminder) updateReminder(linkedReminder.id, { at: remindAt, title, note, notified: undefined, eventId: data.eventId, contactId: cid })
      else addReminder({ title, note, at: remindAt, repeat: 'none', done: false, shopItemId: itemId, eventId: data.eventId, contactId: cid })
    } else if (linkedReminder) deleteReminder(linkedReminder.id)

    toast(editing ? 'Item updated' : 'Added to shopping list')
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    const { ok } = await confirm({ title: `Delete "${editing.name}"?`, message: 'Its reminder will be removed too. Any expense already recorded stays.' })
    if (!ok) return
    deleteShopItem(editing.id)
    toast('Item deleted', 'info')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit shopping item' : 'Add to shopping list'}
      subtitle="What to buy, for which purpose, from where and by when"
      footer={
        <>
          {editing && <Button variant="ghost" icon={Trash2} onClick={remove} className="text-expense hover:text-expense">Delete</Button>}
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-32" size="lg" onClick={save}>{editing ? 'Save' : 'Add item'}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label="Item">
          <Input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Benarasi saree, Cement bags, Fans" autoFocus={!editing} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity"><Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 2, 20 kg" /></Field>
          <Field label="Approx. price">
            <Input inputMode="decimal" value={estimate} onChange={(e) => setEstimate(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
          </Field>
        </div>

        {events.length > 0 && (
          <Field label="For event (optional)">
            <Select value={eventId} onChange={(e) => {
              setEventId(e.target.value)
              const ev = events.find((x) => x.id === e.target.value)
              if (ev && !categoryId) setCategoryId(EVENT_SUGGESTED_CATEGORIES[ev.kind][0])
            }}>
              <option value="">Not for an event</option>
              {events.filter((e) => e.status === 'active' || e.id === eventId).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Category">
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPurposeId(undefined) }}>
            <option value="">Choose category</option>
            {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <PurposePicker category={category} value={purposeId} onChange={setPurposeId} />

        <div className="rounded-2xl border border-line p-3.5 space-y-3 bg-surface-2/40">
          <p className="text-xs font-semibold text-muted flex items-center gap-1.5"><Store className="size-3.5" /> Where to buy</p>
          <Select value={contactId} onChange={(e) => setContactId(e.target.value)} className="bg-surface">
            <option value="">Not decided</option>
            {contacts.length > 0 && (
              <optgroup label="Saved shops & people">
                {[...contacts].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </optgroup>
            )}
            <option value="new">+ New shop (save to contacts)</option>
            <option value="custom">Just type a name (don't save)</option>
          </Select>
          {(contactId === 'new' || contactId === 'custom') && (
            <div className="grid sm:grid-cols-2 gap-3 anim-fade">
              <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Shop / person name" className="bg-surface" />
              <Input type="tel" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="Mobile number" className="bg-surface" />
              {contactId === 'new' && <Input value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Address / area (optional)" className="bg-surface sm:col-span-2" />}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Need by"><Input type="date" value={needBy} onChange={(e) => { setNeedBy(e.target.value); if (!linkedReminder) setRemindAt(defaultRemindAt(e.target.value)) }} /></Field>
          <div>
            <span className="block text-xs font-semibold text-muted mb-1.5">Priority</span>
            <div className="flex gap-1.5">
              {(Object.keys(PRIORITY) as Priority[]).reverse().map((p) => (
                <Chip key={p} active={priority === p} color={PRIORITY[p].color} onClick={() => setPriority(p)} className="px-2.5 h-12 sm:h-11 rounded-xl flex-1 justify-center">{PRIORITY[p].label}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line p-3.5 space-y-3">
          <Toggle checked={remind} onChange={setRemind} label={<span className="inline-flex items-center gap-1.5"><BellRing className="size-4 text-primary" /> Remind me</span>} hint="Get a notification so you don't forget" />
          {remind && (
            <div className="grid grid-cols-2 gap-3 anim-fade">
              <Input type="date" value={remindAt.slice(0, 10)} onChange={(e) => setRemindAt(`${e.target.value || today()}T${remindAt.slice(11) || '10:00'}`)} />
              <Input type="time" value={remindAt.slice(11)} onChange={(e) => setRemindAt(`${remindAt.slice(0, 10)}T${e.target.value || '10:00'}`)} />
            </div>
          )}
        </div>

        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Colour, size, brand, who will go…" /></Field>
        {error && <p className="text-sm font-medium text-expense">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export function BuyDialog({ item, onClose }: { item: ShopItem; onClose: () => void }) {
  const { settings, addTx, updateShopItem, reminders, updateReminder, categories } = useStore()
  const toast = useUI((s) => s.toast)
  const [amount, setAmount] = useState(item.estimate ? String(item.estimate) : '')
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState<PayMethod>('upi')
  const [log, setLog] = useState(true)
  const fallbackCat = categories.find((c) => c.id === 'shopping') ?? categories.find((c) => c.type === 'expense')

  const save = () => {
    const value = parseFloat(amount) || 0
    let txId: string | undefined
    if (log && value > 0) {
      txId = addTx({ type: 'expense', amount: value, date, categoryId: item.categoryId ?? fallbackCat?.id ?? 'other', purposeId: item.purposeId, note: `${item.name}${item.qty ? ` (${item.qty})` : ''}`, method, eventId: item.eventId }).id
    }
    updateShopItem(item.id, { status: 'bought', boughtAt: date, actualPrice: value || undefined, txId })
    for (const r of reminders.filter((x) => x.shopItemId === item.id && !x.done)) updateReminder(r.id, { done: true })
    toast(txId ? `Bought · ${money(value, settings.currency)} added to expenses` : 'Marked as bought')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Check className="size-5 text-income" /> Bought it?</span>}
      subtitle={item.name}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-32" size="lg" onClick={save}>Mark as bought</Button></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label="How much did you pay?"><AmountInput value={amount} onChange={setAmount} currency={settings.currency} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} /></Field>
          <Field label="Paid via">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {(Object.keys(PAY_METHODS) as PayMethod[]).map((m) => <option key={m} value={m}>{PAY_METHODS[m].label}</option>)}
            </Select>
          </Field>
        </div>
        <Toggle checked={log} onChange={setLog} label="Add to my expenses" hint="Records this purchase in transactions (and the event, if linked)" />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export function ShopItemCard({ item, showEvent = true }: { item: ShopItem; showEvent?: boolean }) {
  const { categories, events, contacts, settings, reminders, updateShopItem, transactions, deleteTx } = useStore()
  const { openForm, toast } = useUI()
  const cat = categories.find((c) => c.id === item.categoryId)
  const purpose = findPurpose(categories, item.categoryId, item.purposeId)
  const ev = showEvent && item.eventId ? events.find((e) => e.id === item.eventId) : undefined
  const contact = item.contactId ? contacts.find((c) => c.id === item.contactId) : undefined
  const shop = contact?.name ?? item.shopName
  const phone = contact?.phone || item.shopPhone
  const bought = item.status === 'bought'
  const overdue = !bought && item.needBy && daysUntil(item.needBy) < 0
  const soon = !bought && item.needBy && daysUntil(item.needBy) <= 2
  const hasReminder = reminders.some((r) => r.shopItemId === item.id && !r.done)

  const toggle = async () => {
    if (!bought) return openForm({ kind: 'buy', item })
    const tx = item.txId ? transactions.find((t) => t.id === item.txId) : undefined
    const { ok, checked } = await confirm({ title: 'Move back to pending?', message: 'The item goes back on your shopping list.', confirmLabel: 'Move back', tone: 'primary', checkbox: tx ? `Also delete the ${money(tx.amount, settings.currency)} expense` : undefined })
    if (!ok) return
    if (checked && tx) deleteTx(tx.id)
    updateShopItem(item.id, { status: 'pending', boughtAt: undefined, actualPrice: undefined, txId: checked ? undefined : item.txId })
    toast('Moved back to list', 'info')
  }

  return (
    <div onClick={() => openForm({ kind: 'shop', editing: item })} className={cn('flex items-start gap-3 p-3.5 rounded-2xl bg-surface border border-line cursor-pointer hover:border-primary/30 transition active:scale-[0.995]', bought && 'opacity-70')}>
      <button
        onClick={(e) => { e.stopPropagation(); toggle() }}
        aria-label={bought ? 'Mark as not bought' : 'Mark as bought'}
        className={cn('mt-0.5 grid place-items-center size-7 rounded-full border-2 shrink-0 transition active:scale-90', bought ? 'bg-income border-income text-white' : 'border-line hover:border-income')}
        style={!bought ? { borderColor: PRIORITY[item.priority].color + '99' } : undefined}
      >
        {bought ? <Check className="size-4" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('font-semibold text-[15px] leading-snug', bought && 'line-through decoration-2 decoration-muted/50')}>
            {item.name}
            {item.qty && <span className="text-muted font-medium text-sm"> · {item.qty}</span>}
          </p>
          <span className="num text-sm font-bold shrink-0">{bought ? (item.actualPrice ? money(item.actualPrice, settings.currency) : '') : item.estimate ? `~${money(item.estimate, settings.currency)}` : ''}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {purpose && cat && <Badge color={cat.color}>{purpose.name}</Badge>}
          {!purpose && cat && <Badge color={cat.color}>{cat.name}</Badge>}
          {ev && <Badge color={ev.color} className="max-w-40 truncate">{ev.name}</Badge>}
          {item.priority === 'high' && !bought && <Badge color={PRIORITY.high.color}><Flag className="size-3" /> High</Badge>}
          {item.needBy && !bought && (
            <span className={cn('text-[11px] font-semibold', overdue ? 'text-expense' : soon ? 'text-due' : 'text-muted')}>{dueLabel(item.needBy)}</span>
          )}
          {bought && item.boughtAt && <span className="text-[11px] font-semibold text-income">Bought {dueLabel(item.boughtAt).toLowerCase()}</span>}
          {hasReminder && <BellRing className="size-3.5 text-primary" />}
        </div>
        {(shop || phone) && (
          <div className="flex items-center justify-between gap-2 mt-2.5">
            <span className="text-xs text-muted flex items-center gap-1.5 min-w-0"><Store className="size-3.5 shrink-0" /><span className="truncate">{shop || phone}</span></span>
            <PhoneActions phone={phone} size="sm" />
          </div>
        )}
        {bought && (
          <button onClick={(e) => { e.stopPropagation(); toggle() }} className="mt-2 text-[11px] font-semibold text-muted inline-flex items-center gap-1 hover:text-ink"><Undo2 className="size-3" /> Not bought yet</button>
        )}
      </div>
    </div>
  )
}

export const shopListText = (items: ShopItem[], ctx: { categories: ReturnType<typeof useStore.getState>['categories']; contacts: ReturnType<typeof useStore.getState>['contacts']; currency: string; title: string }) => {
  const lines = [`🛒 *${ctx.title}*`, '']
  items.forEach((i, n) => {
    const purpose = findPurpose(ctx.categories, i.categoryId, i.purposeId)
    const shop = (i.contactId && ctx.contacts.find((c) => c.id === i.contactId)?.name) || i.shopName
    lines.push(`${n + 1}. ${i.name}${i.qty ? ` — ${i.qty}` : ''}${i.estimate ? ` (~${money(i.estimate, ctx.currency)})` : ''}`)
    const meta = [purpose?.name, shop && `from ${shop}`, i.needBy && `by ${dueLabel(i.needBy)}`].filter(Boolean).join(' · ')
    if (meta) lines.push(`   ${meta}`)
  })
  lines.push('', `Sent from Spendly · ${toISODate(new Date())}`)
  return lines.join('\n')
}

