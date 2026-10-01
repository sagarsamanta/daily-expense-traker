import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookUser, Plus, Search, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import type { ContactKind } from '../lib/types'
import { canPickContacts, ContactCard } from '../components/Contacts'
import { Button, Card, EmptyState, Input, PageHeader, Segmented } from '../components/ui'

type Tab = 'all' | ContactKind | 'events'

export default function Contacts() {
  const { contacts, parties, events, shopItems } = useStore()
  const openForm = useUI((s) => s.openForm)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()

  const list = useMemo(
    () => contacts
      .filter((c) => (tab === 'all' || tab === c.kind) && (!needle || `${c.name} ${c.phone} ${c.address} ${c.notes}`.toLowerCase().includes(needle)))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [contacts, tab, needle],
  )
  const people = useMemo(
    () => parties
      .filter((p) => p.phone && (!needle || `${p.name} ${p.phone} ${p.role}`.toLowerCase().includes(needle)))
      .map((p) => ({ p, ev: events.find((e) => e.id === p.eventId) }))
      .sort((a, b) => a.p.name.localeCompare(b.p.name)),
    [parties, events, needle],
  )

  const pendingAt = (id: string) => shopItems.filter((i) => i.contactId === id && i.status === 'pending').length

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Shops, vendors and people — call or WhatsApp in one tap"
        actions={<>
          {canPickContacts() && <Button variant="secondary" icon={BookUser} onClick={() => openForm({ kind: 'contact' })}><span className="max-sm:hidden">From phone</span></Button>}
          <Button icon={Plus} onClick={() => openForm({ kind: 'contact' })}>Add</Button>
        </>}
      />
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="size-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, area…" className="pl-10 bg-surface border-line" />
        </div>
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Segmented<Tab> size="sm" value={tab} onChange={setTab} options={[
            { value: 'all', label: `All (${contacts.length})` },
            { value: 'shop', label: 'Shops' },
            { value: 'person', label: 'People' },
            { value: 'service', label: 'Services' },
            { value: 'events', label: `Event vendors (${parties.filter((p) => p.phone).length})` },
          ]} />
        </div>
      </div>

      {tab === 'events' ? (
        people.length ? (
          <div className="grid lg:grid-cols-2 gap-2.5">
            {people.map(({ p, ev }) => (
              <ContactCard key={p.id} c={{ name: p.name, phone: p.phone, address: '' }} subtitle={`${p.role ? `${p.role} · ` : ''}${ev?.name ?? ''}`} onClick={() => ev && navigate(`/events/${ev.id}`)} />
            ))}
          </div>
        ) : <Card><EmptyState icon={Users} title="No vendor numbers yet" text="Phone numbers you add to people & vendors inside events show up here." /></Card>
      ) : list.length ? (
        <div className="grid lg:grid-cols-2 gap-2.5">
          {list.map((c) => {
            const n = pendingAt(c.id)
            return <ContactCard key={c.id} c={c} subtitle={[c.phone, n ? `${n} to buy` : ''].filter(Boolean).join(' · ')} onClick={() => openForm({ kind: 'contact', editing: c })} />
          })}
        </div>
      ) : (
        <Card>
          <EmptyState icon={BookUser} title={contacts.length ? 'No matches' : 'No contacts yet'} text="Save shops, tailors, caterers, relatives — with their number and area — and call or WhatsApp them right from here." action={<Button icon={Plus} onClick={() => openForm({ kind: 'contact' })}>Add contact</Button>} />
        </Card>
      )}
    </div>
  )
}
