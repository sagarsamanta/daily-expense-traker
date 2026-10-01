import { useMemo, useState } from 'react'
import { Plus, Search, Share2, ShoppingBag, Store } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { daysUntil, money, startOfMonth, sum } from '../lib/format'
import { findPurpose } from '../lib/selectors'
import { waShareHref } from '../lib/phone'
import type { ShopItem } from '../lib/types'
import { PhoneActions } from '../components/PhoneActions'
import { ShopItemCard, shopListText } from '../components/ShopItems'
import { Button, Card, cn, EmptyState, Input, PageHeader, Segmented, Select } from '../components/ui'

type Group = 'date' | 'purpose' | 'shop' | 'event'

export function ShoppingList({ items, group, showEvent = true }: { items: ShopItem[]; group: Group; showEvent?: boolean }) {
  const { categories, contacts, events } = useStore()
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; title: string; color?: string; phone?: string; address?: string; order: number; items: ShopItem[] }>()
    const put = (key: string, title: string, order: number, i: ShopItem, extra: { color?: string; phone?: string; address?: string } = {}) => {
      const g = m.get(key) ?? { key, title, order, items: [], ...extra }
      g.items.push(i)
      m.set(key, g)
    }
    for (const i of items) {
      if (group === 'date') {
        if (i.status === 'bought') put('bought', 'Bought', 9, i)
        else if (!i.needBy) put('none', 'No date', 8, i)
        else {
          const d = daysUntil(i.needBy)
          if (d < 0) put('overdue', 'Overdue', 0, i, { color: 'var(--expense)' })
          else if (d === 0) put('today', 'Today', 1, i, { color: 'var(--due)' })
          else if (d <= 7) put('week', 'Next 7 days', 2, i)
          else put('later', 'Later', 3, i)
        }
      } else if (group === 'purpose') {
        const cat = categories.find((c) => c.id === i.categoryId)
        const p = findPurpose(categories, i.categoryId, i.purposeId)
        const key = `${i.categoryId ?? ''}|${i.purposeId ?? ''}`
        put(key, p ? `${p.name}` : cat?.name ?? 'No purpose', p ? 0 : cat ? 1 : 2, i, { color: cat?.color })
      } else if (group === 'shop') {
        const c = i.contactId ? contacts.find((x) => x.id === i.contactId) : undefined
        const name = c?.name ?? i.shopName
        put(name ? name.toLowerCase() : '~', name || 'Shop not decided', name ? 0 : 1, i, { phone: c?.phone || i.shopPhone, address: c?.address })
      } else {
        const ev = i.eventId ? events.find((e) => e.id === i.eventId) : undefined
        put(ev?.id ?? '~', ev?.name ?? 'Personal / daily', ev ? 0 : 1, i, { color: ev?.color })
      }
    }
    const pr = { high: 0, medium: 1, low: 2 }
    return [...m.values()]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map((g) => ({ ...g, items: g.items.sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1) || pr[a.priority] - pr[b.priority] || (a.needBy ?? '9').localeCompare(b.needBy ?? '9')) }))
  }, [items, group, categories, contacts, events])

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="flex items-center justify-between gap-2 px-1 mb-2 min-h-8">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0" style={{ color: g.color ?? 'var(--muted)' }}>
              {group === 'shop' && <Store className="size-3.5 shrink-0" />}
              <span className="truncate">{g.title}</span>
              <span className="text-muted font-semibold normal-case tracking-normal shrink-0 whitespace-nowrap">· {g.items.length}</span>
            </h3>
            {group === 'shop' && <PhoneActions phone={g.phone} address={g.address} size="sm" />}
          </div>
          <div className="grid lg:grid-cols-2 gap-2.5">
            {g.items.map((i) => <ShopItemCard key={i.id} item={i} showEvent={showEvent} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function Shopping() {
  const { shopItems, events, categories, contacts, settings } = useStore()
  const { openForm, toast } = useUI()
  const cur = settings.currency
  const [status, setStatus] = useState<'pending' | 'bought' | 'all'>('pending')
  const [group, setGroup] = useState<Group>('date')
  const [ev, setEv] = useState('')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return shopItems.filter((i) => {
      if (status !== 'all' && i.status !== status) return false
      if (ev === 'none' ? !!i.eventId : ev && i.eventId !== ev) return false
      if (needle) {
        const shop = (i.contactId && contacts.find((c) => c.id === i.contactId)?.name) || i.shopName
        const p = findPurpose(categories, i.categoryId, i.purposeId)?.name ?? ''
        if (!`${i.name} ${i.notes} ${shop} ${p}`.toLowerCase().includes(needle)) return false
      }
      return true
    })
  }, [shopItems, status, ev, q, contacts, categories])

  const pending = shopItems.filter((i) => i.status === 'pending')
  const overdue = pending.filter((i) => i.needBy && daysUntil(i.needBy) < 0).length
  const boughtMonth = sum(shopItems.filter((i) => i.status === 'bought' && (i.boughtAt ?? '') >= startOfMonth()), (i) => i.actualPrice ?? 0)

  const share = async () => {
    const list = filtered.filter((i) => i.status === 'pending')
    if (!list.length) return toast('Nothing pending to share', 'info')
    const evName = ev && ev !== 'none' ? events.find((e) => e.id === ev)?.name : undefined
    const text = shopListText(list, { categories, contacts, currency: cur, title: evName ? `Shopping list — ${evName}` : 'Shopping list' })
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch { /* cancelled */ }
    }
    window.open(waShareHref(text), '_blank')
  }

  return (
    <div>
      <PageHeader
        title="Shopping list"
        subtitle="Everything you need to buy — for which purpose, from whom, and by when"
        actions={<>
          <Button variant="secondary" icon={Share2} onClick={share}><span className="max-sm:hidden">Share</span></Button>
          <Button icon={Plus} onClick={() => openForm({ kind: 'shop', preset: ev && ev !== 'none' ? { eventId: ev } : undefined })}>Add</Button>
        </>}
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-5">
        {[
          { label: 'To buy', value: String(pending.length), sub: overdue ? `${overdue} overdue` : 'items', warn: overdue > 0 },
          { label: 'Estimated', value: money(sum(pending, (i) => i.estimate), cur, true), sub: 'still to spend' },
          { label: 'Bought', value: money(boughtMonth, cur, true), sub: 'this month' },
        ].map((s) => (
          <Card key={s.label} className="px-3.5 py-3">
            <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">{s.label}</p>
            <p className="num font-extrabold text-lg sm:text-2xl tracking-tight mt-0.5 truncate">{s.value}</p>
            <p className={cn('text-[11px] font-medium', s.warn ? 'text-expense' : 'text-muted')}>{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, shop, purpose…" className="pl-10 bg-surface border-line" />
          </div>
          {events.length > 0 && (
            <div className="w-36 sm:w-52 shrink-0">
              <Select value={ev} onChange={(e) => setEv(e.target.value)} className="bg-surface border-line">
                <option value="">All events</option>
                <option value="none">Personal / daily</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'pending', label: 'To buy' }, { value: 'bought', label: 'Bought' }, { value: 'all', label: 'All' }]} />
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-muted font-semibold shrink-0">Group</span>
            <Segmented size="sm" value={group} onChange={setGroup} options={[{ value: 'date', label: 'Date' }, { value: 'purpose', label: 'Purpose' }, { value: 'shop', label: 'Shop' }, { value: 'event', label: 'Event' }]} />
          </div>
        </div>
      </div>

      {filtered.length ? (
        <ShoppingList items={filtered} group={group} />
      ) : (
        <Card>
          <EmptyState
            icon={ShoppingBag}
            title={shopItems.length ? 'Nothing here' : 'Your shopping list is empty'}
            text={shopItems.length ? 'Try another filter.' : 'Add things you need to buy — for the wedding, the house or home — with the shop, its number and a reminder so nothing is forgotten.'}
            action={<Button icon={Plus} onClick={() => openForm({ kind: 'shop' })}>Add item</Button>}
          />
        </Card>
      )}
    </div>
  )
}
