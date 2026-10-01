import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, LEGACY_CATEGORY_IDS } from '../lib/defaults'
import { uid } from '../lib/format'
import { buildSampleData } from '../lib/sample'
import type { AppData, Category, Contact, EventItem, Party, Reminder, Settings, ShopItem, Transaction } from '../lib/types'

type New<T> = Omit<T, 'id' | 'createdAt'>

interface Actions {
  addTx: (t: New<Transaction>) => Transaction
  updateTx: (id: string, patch: Partial<Transaction>) => void
  deleteTx: (id: string) => void
  restoreTx: (t: Transaction) => void
  addEvent: (e: New<EventItem>) => EventItem
  updateEvent: (id: string, patch: Partial<EventItem>) => void
  deleteEvent: (id: string, removeTransactions: boolean) => void
  addParty: (p: New<Party>) => Party
  updateParty: (id: string, patch: Partial<Party>) => void
  deleteParty: (id: string) => void
  addCategory: (c: Omit<Category, 'id'>) => Category
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void
  addPurpose: (categoryId: string, name: string) => string
  renamePurpose: (categoryId: string, purposeId: string, name: string) => void
  deletePurpose: (categoryId: string, purposeId: string) => void
  addContact: (c: New<Contact>) => Contact
  updateContact: (id: string, patch: Partial<Contact>) => void
  deleteContact: (id: string) => void
  addShopItem: (s: New<ShopItem>) => ShopItem
  updateShopItem: (id: string, patch: Partial<ShopItem>) => void
  deleteShopItem: (id: string) => void
  addReminder: (r: New<Reminder>) => Reminder
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  deleteReminder: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  importData: (data: AppData) => void
  loadSample: () => void
  resetAll: () => void
}

const initial = (): AppData => ({
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  events: [],
  parties: [],
  contacts: [],
  shopItems: [],
  reminders: [],
  settings: DEFAULT_SETTINGS,
})

const normaliseCategories = (cats: Category[] | undefined, used: Set<string>): Category[] => {
  const defaults = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]))
  const out: Category[] = []
  for (const c of cats ?? []) {
    if (LEGACY_CATEGORY_IDS.includes(c.id) && !used.has(c.id)) continue
    const def = defaults.get(c.id)
    out.push({ ...c, purposes: c.purposes ?? def?.purposes ?? [] })
  }
  for (const d of DEFAULT_CATEGORIES) if (!out.some((c) => c.id === d.id)) out.push(d)
  return out
}

const normalise = (data: Partial<AppData>): AppData => {
  const used = new Set([...(data.transactions ?? []).map((t) => t.categoryId), ...(data.parties ?? []).map((p) => p.categoryId ?? '')])
  return {
    categories: normaliseCategories(data.categories, used),
    transactions: data.transactions ?? [],
    events: data.events ?? [],
    parties: data.parties ?? [],
    contacts: data.contacts ?? [],
    shopItems: data.shopItems ?? [],
    reminders: data.reminders ?? [],
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  }
}

const mapCats = (cats: Category[], id: string, f: (c: Category) => Category) => cats.map((c) => (c.id === id ? f(c) : c))

export const useStore = create<AppData & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),

      addTx: (t) => {
        const tx = { ...t, id: uid(), createdAt: Date.now() }
        set((s) => ({ transactions: [...s.transactions, tx] }))
        return tx
      },
      updateTx: (id, patch) => set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTx: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          shopItems: s.shopItems.map((i) => (i.txId === id ? { ...i, txId: undefined } : i)),
        })),
      restoreTx: (t) => set((s) => ({ transactions: [...s.transactions, t] })),

      addEvent: (e) => {
        const ev = { ...e, id: uid(), createdAt: Date.now() }
        set((s) => ({ events: [...s.events, ev] }))
        return ev
      },
      updateEvent: (id, patch) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEvent: (id, removeTransactions) =>
        set((s) => {
          const partyIds = new Set(s.parties.filter((p) => p.eventId === id).map((p) => p.id))
          return {
            events: s.events.filter((e) => e.id !== id),
            parties: s.parties.filter((p) => p.eventId !== id),
            transactions: removeTransactions
              ? s.transactions.filter((t) => t.eventId !== id)
              : s.transactions.map((t) => (t.eventId === id ? { ...t, eventId: undefined, partyId: undefined } : t)),
            shopItems: s.shopItems.map((i) => (i.eventId === id ? { ...i, eventId: undefined } : i)),
            reminders: s.reminders.map((r) => (r.eventId === id || (r.partyId && partyIds.has(r.partyId)) ? { ...r, eventId: undefined, partyId: undefined } : r)),
          }
        }),

      addParty: (p) => {
        const party = { ...p, id: uid(), createdAt: Date.now() }
        set((s) => ({ parties: [...s.parties, party] }))
        return party
      },
      updateParty: (id, patch) => set((s) => ({ parties: s.parties.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteParty: (id) =>
        set((s) => ({
          parties: s.parties.filter((p) => p.id !== id),
          transactions: s.transactions.map((t) => (t.partyId === id ? { ...t, partyId: undefined } : t)),
          reminders: s.reminders.map((r) => (r.partyId === id ? { ...r, partyId: undefined } : r)),
        })),

      addCategory: (c) => {
        const cat = { ...c, id: uid() }
        set((s) => ({ categories: [...s.categories, cat] }))
        return cat
      },
      updateCategory: (id, patch) => set((s) => ({ categories: mapCats(s.categories, id, (c) => ({ ...c, ...patch })) })),
      deleteCategory: (id) => {
        const cat = get().categories.find((c) => c.id === id)
        if (!cat) return
        const fallback = get().categories.find((c) => c.id !== id && c.type === cat.type && /other/i.test(c.name)) ??
          get().categories.find((c) => c.id !== id && c.type === cat.type)
        const move = <T extends { categoryId?: string; purposeId?: string }>(x: T): T => (x.categoryId === id ? { ...x, categoryId: fallback?.id, purposeId: undefined } : x)
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          transactions: fallback ? s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: fallback.id, purposeId: undefined } : t)) : s.transactions,
          parties: s.parties.map(move),
          shopItems: s.shopItems.map(move),
        }))
      },
      addPurpose: (categoryId, name) => {
        const id = uid()
        set((s) => ({ categories: mapCats(s.categories, categoryId, (c) => ({ ...c, purposes: [...c.purposes, { id, name }] })) }))
        return id
      },
      renamePurpose: (categoryId, purposeId, name) =>
        set((s) => ({ categories: mapCats(s.categories, categoryId, (c) => ({ ...c, purposes: c.purposes.map((p) => (p.id === purposeId ? { ...p, name } : p)) })) })),
      deletePurpose: (categoryId, purposeId) => {
        const clear = <T extends { purposeId?: string }>(x: T): T => (x.purposeId === purposeId ? { ...x, purposeId: undefined } : x)
        set((s) => ({
          categories: mapCats(s.categories, categoryId, (c) => ({ ...c, purposes: c.purposes.filter((p) => p.id !== purposeId) })),
          transactions: s.transactions.map(clear),
          parties: s.parties.map(clear),
          shopItems: s.shopItems.map(clear),
        }))
      },

      addContact: (c) => {
        const contact = { ...c, id: uid(), createdAt: Date.now() }
        set((s) => ({ contacts: [...s.contacts, contact] }))
        return contact
      },
      updateContact: (id, patch) => set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          shopItems: s.shopItems.map((i) => (i.contactId === id ? { ...i, contactId: undefined } : i)),
          reminders: s.reminders.map((r) => (r.contactId === id ? { ...r, contactId: undefined } : r)),
        })),

      addShopItem: (i) => {
        const item = { ...i, id: uid(), createdAt: Date.now() }
        set((s) => ({ shopItems: [...s.shopItems, item] }))
        return item
      },
      updateShopItem: (id, patch) => set((s) => ({ shopItems: s.shopItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      deleteShopItem: (id) =>
        set((s) => ({
          shopItems: s.shopItems.filter((i) => i.id !== id),
          reminders: s.reminders.filter((r) => r.shopItemId !== id),
        })),

      addReminder: (r) => {
        const rem = { ...r, id: uid(), createdAt: Date.now() }
        set((s) => ({ reminders: [...s.reminders, rem] }))
        return rem
      },
      updateReminder: (id, patch) => set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      importData: (data) => set(normalise(data)),
      loadSample: () =>
        set((s) => {
          const d = buildSampleData()
          return { ...d, settings: { ...d.settings, theme: s.settings.theme, name: s.settings.name } }
        }),
      resetAll: () => set((s) => ({ ...initial(), settings: { ...DEFAULT_SETTINGS, theme: s.settings.theme } })),
    }),
    {
      name: 'spendly-data',
      version: 2,
      migrate: (persisted) => normalise((persisted ?? {}) as Partial<AppData>),
      merge: (persisted, current) => ({ ...current, ...normalise((persisted ?? {}) as Partial<AppData>) }),
      partialize: (s) => ({
        categories: s.categories,
        transactions: s.transactions,
        events: s.events,
        parties: s.parties,
        contacts: s.contacts,
        shopItems: s.shopItems,
        reminders: s.reminders,
        settings: s.settings,
      }),
    },
  ),
)

export const useCurrency = () => useStore((s) => s.settings.currency)
