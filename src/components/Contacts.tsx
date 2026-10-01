import { useState } from 'react'
import type { ReactNode } from 'react'
import { BellPlus, BookUser, ShoppingBag, Store, Trash2, User, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { initials } from '../lib/phone'
import { fmtDateTime } from '../lib/format'
import type { Contact, ContactKind } from '../lib/types'
import { PhoneActions } from './PhoneActions'
import { Badge, Button, cn, confirm, Field, Input, Modal, Segmented, Textarea } from './ui'

export const CONTACT_KINDS: Record<ContactKind, { label: string; icon: LucideIcon; color: string }> = {
  shop: { label: 'Shop', icon: Store, color: '#f97316' },
  person: { label: 'Person', icon: User, color: '#5b5ef4' },
  service: { label: 'Service', icon: Wrench, color: '#14b8a6' },
}

type PickedContact = { name?: string[]; tel?: string[]; address?: { addressLine?: string[]; city?: string }[] }
type ContactsNav = Navigator & { contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<PickedContact[]>; getProperties?: () => Promise<string[]> } }

export const canPickContacts = () => typeof navigator !== 'undefined' && 'contacts' in navigator && !!(navigator as ContactsNav).contacts?.select

export function ContactForm({ editing, preset, onClose }: { editing?: Contact; preset?: Partial<Contact>; onClose: () => void }) {
  const { addContact, updateContact, deleteContact, shopItems, reminders } = useStore()
  const { toast, openForm } = useUI()
  const base = editing ?? preset ?? {}
  const [name, setName] = useState(base.name ?? '')
  const [kind, setKind] = useState<ContactKind>(base.kind ?? 'shop')
  const [phone, setPhone] = useState(base.phone ?? '')
  const [altPhone, setAltPhone] = useState(base.altPhone ?? '')
  const [address, setAddress] = useState(base.address ?? '')
  const [notes, setNotes] = useState(base.notes ?? '')
  const [error, setError] = useState('')
  const items = editing ? shopItems.filter((i) => i.contactId === editing.id && i.status === 'pending') : []
  const rems = editing ? reminders.filter((r) => r.contactId === editing.id && !r.done) : []

  const pick = async () => {
    try {
      const nav = navigator as ContactsNav
      const props = (await nav.contacts!.getProperties?.()) ?? ['name', 'tel']
      const [c] = await nav.contacts!.select(props.filter((p) => ['name', 'tel', 'address'].includes(p)), { multiple: false })
      if (!c) return
      if (c.name?.[0]) setName(c.name[0])
      if (c.tel?.[0]) setPhone(c.tel[0])
      if (c.tel?.[1]) setAltPhone(c.tel[1])
      const a = c.address?.[0]
      if (a) setAddress([...(a.addressLine ?? []), a.city].filter(Boolean).join(', '))
    } catch {
      toast('Could not open phone contacts', 'error')
    }
  }

  const save = () => {
    if (!name.trim()) return setError('Enter a name.')
    const data = { name: name.trim(), kind, phone: phone.trim(), altPhone: altPhone.trim(), address: address.trim(), notes: notes.trim() }
    if (editing) updateContact(editing.id, data)
    else addContact(data)
    toast(editing ? 'Contact updated' : 'Contact saved')
    onClose()
  }

  const remove = async () => {
    if (!editing) return
    const { ok } = await confirm({ title: `Delete ${editing.name}?`, message: 'Shopping items and reminders linked to this contact will be kept.' })
    if (!ok) return
    deleteContact(editing.id)
    toast('Contact deleted', 'info')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? editing.name : 'New contact'}
      subtitle={editing ? CONTACT_KINDS[editing.kind].label : 'Shops, vendors, family — anyone you buy from or pay'}
      footer={
        <>
          {editing && <Button variant="ghost" icon={Trash2} onClick={remove} className="text-expense hover:text-expense">Delete</Button>}
          <Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-28" size="lg" onClick={save}>Save</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        {editing && (phone || address) && (
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
            <span className="text-sm font-semibold">{phone || address}</span>
            <PhoneActions phone={phone} address={address} sms />
          </div>
        )}
        {!editing && canPickContacts() && (
          <Button type="button" variant="soft" icon={BookUser} className="w-full" onClick={pick}>Pick from phone contacts</Button>
        )}
        <Segmented className="w-full" value={kind} onChange={setKind} options={(Object.keys(CONTACT_KINDS) as ContactKind[]).map((k) => {
          const K = CONTACT_KINDS[k]
          return { value: k, label: <><K.icon className="size-4" /> {K.label}</> }
        })} />
        <Field label="Name"><Input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={kind === 'shop' ? 'e.g. Gariahat Saree Emporium' : kind === 'service' ? 'e.g. Laxmi Tent House' : 'e.g. Rahul (cousin)'} autoFocus={!editing} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile"><Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98300 12345" /></Field>
          <Field label="Other number"><Input type="tel" inputMode="tel" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} placeholder="Optional" /></Field>
        </div>
        <Field label="Address / area"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opens in Google Maps" /></Field>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Timings, who to ask for, discount…" /></Field>
        {error && <p className="text-sm font-medium text-expense">{error}</p>}

        {editing && (
          <div className="space-y-2 pt-1">
            {items.length > 0 && (
              <div className="rounded-2xl border border-line p-3">
                <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5"><ShoppingBag className="size-3.5" /> To buy here ({items.length})</p>
                {items.map((i) => <p key={i.id} className="text-sm py-1">{i.name}{i.qty ? ` · ${i.qty}` : ''}</p>)}
              </div>
            )}
            {rems.length > 0 && (
              <div className="rounded-2xl border border-line p-3">
                <p className="text-xs font-semibold text-muted mb-2">Reminders</p>
                {rems.map((r) => <p key={r.id} className="text-sm py-1">{r.title} <span className="text-muted text-xs">· {fmtDateTime(r.at)}</span></p>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" size="sm" icon={BellPlus} onClick={() => openForm({ kind: 'reminder', preset: { title: `Call ${editing.name}`, contactId: editing.id } })}>Remind to call</Button>
              <Button type="button" variant="secondary" size="sm" icon={ShoppingBag} onClick={() => openForm({ kind: 'shop', preset: { contactId: editing.id } })}>Add item to buy</Button>
            </div>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export function ContactCard({ c, subtitle, onClick }: { c: Pick<Contact, 'name' | 'phone' | 'address'> & { kind?: ContactKind }; subtitle?: ReactNode; onClick?: () => void }) {
  const K = c.kind ? CONTACT_KINDS[c.kind] : undefined
  const color = K?.color ?? '#64748b'
  return (
    <div onClick={onClick} className={cn('flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line transition', onClick && 'cursor-pointer hover:border-primary/30')}>
      <span className="grid place-items-center size-11 rounded-full text-sm font-bold shrink-0" style={{ background: `${color}22`, color }}>{initials(c.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[15px] leading-snug line-clamp-2 break-words">{c.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          {K && <Badge color={K.color}>{K.label}</Badge>}
          <span className="text-xs text-muted truncate">{subtitle ?? c.phone ?? ''}</span>
        </div>
      </div>
      <PhoneActions phone={c.phone} address={c.address} />
    </div>
  )
}
