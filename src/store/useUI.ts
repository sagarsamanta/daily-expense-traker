import { create } from 'zustand'
import { uid } from '../lib/format'
import type { Contact, Reminder, ShopItem, Transaction } from '../lib/types'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

export type FormState =
  | { kind: 'shop'; editing?: ShopItem; preset?: Partial<ShopItem> }
  | { kind: 'reminder'; editing?: Reminder; preset?: Partial<Reminder> }
  | { kind: 'contact'; editing?: Contact; preset?: Partial<Contact> }
  | { kind: 'buy'; item: ShopItem }

interface UIState {
  txOpen: boolean
  txEditing?: Transaction
  txPreset?: Partial<Transaction>
  openTx: (preset?: Partial<Transaction>) => void
  editTx: (tx: Transaction) => void
  closeTx: () => void
  form: FormState | null
  openForm: (f: FormState) => void
  closeForm: () => void
  quickAdd: boolean
  setQuickAdd: (v: boolean) => void
  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void
  dismiss: (id: string) => void
}

export const useUI = create<UIState>()((set, get) => ({
  txOpen: false,
  openTx: (preset) => set({ txOpen: true, txEditing: undefined, txPreset: preset, quickAdd: false }),
  editTx: (tx) => set({ txOpen: true, txEditing: tx, txPreset: undefined }),
  closeTx: () => set({ txOpen: false }),
  form: null,
  openForm: (form) => set({ form, quickAdd: false }),
  closeForm: () => set({ form: null }),
  quickAdd: false,
  setQuickAdd: (quickAdd) => set({ quickAdd }),
  toasts: [],
  toast: (message, tone = 'success', action) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone, action }] }))
    setTimeout(() => get().dismiss(id), action ? 5000 : 3000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
