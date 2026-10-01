import { sum } from './format'
import type { Category, EventItem, Party, Transaction } from './types'

export const txOfParty = (partyId: string, txs: Transaction[]) => txs.filter((t) => t.partyId === partyId)

export const partySummary = (party: Party, txs: Transaction[]) => {
  const settled = sum(txOfParty(party.id, txs), (t) => t.amount)
  const due = Math.max(0, party.agreedAmount - settled)
  const extra = Math.max(0, settled - party.agreedAmount)
  const progress = party.agreedAmount > 0 ? Math.min(100, (settled / party.agreedAmount) * 100) : settled > 0 ? 100 : 0
  return { settled, due, extra, progress }
}

export const eventSummary = (event: EventItem, txs: Transaction[], parties: Party[]) => {
  const evTx = txs.filter((t) => t.eventId === event.id)
  const spent = sum(evTx.filter((t) => t.type === 'expense'), (t) => t.amount)
  const received = sum(evTx.filter((t) => t.type === 'income'), (t) => t.amount)
  const evParties = parties.filter((p) => p.eventId === event.id)
  let payDue = 0
  let receiveDue = 0
  let committed = 0
  for (const p of evParties) {
    const s = partySummary(p, txs)
    if (p.direction === 'pay') {
      payDue += s.due
      committed += Math.max(p.agreedAmount, s.settled)
    } else receiveDue += s.due
  }
  const unlinkedSpent = sum(evTx.filter((t) => t.type === 'expense' && !t.partyId), (t) => t.amount)
  const projected = committed + unlinkedSpent
  return {
    txs: evTx,
    parties: evParties,
    spent,
    received,
    net: spent - received,
    remaining: event.budget - spent,
    payDue,
    receiveDue,
    projected,
    budgetPct: event.budget > 0 ? (spent / event.budget) * 100 : 0,
  }
}

export const inRange = (t: Transaction, from?: string, to?: string) => (!from || t.date >= from) && (!to || t.date <= to)

export const byCategory = (txs: Transaction[], categories: Category[]) => {
  const map = new Map<string, number>()
  for (const t of txs) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
  const catMap = new Map(categories.map((c) => [c.id, c]))
  return [...map.entries()]
    .map(([id, value]) => {
      const cat = catMap.get(id)
      return { id, name: cat?.name ?? 'Uncategorised', color: cat?.color ?? '#94a3b8', icon: cat?.icon ?? 'tag', value }
    })
    .sort((a, b) => b.value - a.value)
}

export const sortTx = (txs: Transaction[]) =>
  [...txs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))

export const groupByDate = (txs: Transaction[]) => {
  const groups: { date: string; items: Transaction[]; expense: number; income: number }[] = []
  for (const t of sortTx(txs)) {
    let g = groups[groups.length - 1]
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], expense: 0, income: 0 }
      groups.push(g)
    }
    g.items.push(t)
    if (t.type === 'expense') g.expense += t.amount
    else g.income += t.amount
  }
  return groups
}

export const findPurpose = (categories: Category[], categoryId?: string, purposeId?: string) =>
  purposeId ? categories.find((c) => c.id === categoryId)?.purposes.find((p) => p.id === purposeId) : undefined

export const byPurpose = (txs: Transaction[], categories: Category[]) => {
  const map = new Map<string, number>()
  for (const t of txs) {
    const k = `${t.categoryId}|${t.purposeId ?? ''}`
    map.set(k, (map.get(k) ?? 0) + t.amount)
  }
  const catMap = new Map(categories.map((c) => [c.id, c]))
  return [...map.entries()]
    .map(([k, value]) => {
      const [catId, purposeId] = k.split('|')
      const cat = catMap.get(catId)
      const purpose = cat?.purposes.find((p) => p.id === purposeId)
      return { id: k, name: purpose?.name ?? `${cat?.name ?? 'Uncategorised'}${purposeId ? '' : ' · general'}`, sub: cat?.name, color: cat?.color ?? '#94a3b8', icon: cat?.icon ?? 'tag', value }
    })
    .sort((a, b) => b.value - a.value)
}
