import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { SWATCHES } from '../lib/defaults'
import { CATEGORY_ICONS } from '../lib/icons'
import { uid } from '../lib/format'
import type { Category, Purpose, TxType } from '../lib/types'
import { Button, cn, confirm, IconBubble, IconButton, Input, Modal, Segmented, tint } from './ui'

export function CategoryForm({ editing, type = 'expense', onClose, onSaved }: { editing?: Category; type?: TxType; onClose: () => void; onSaved?: (c: Category) => void }) {
  const { addCategory, updateCategory, transactions } = useStore()
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? 'tag')
  const [color, setColor] = useState(editing?.color ?? SWATCHES[0])
  const [kind, setKind] = useState<TxType>(editing?.type ?? type)
  const [purposes, setPurposes] = useState<Purpose[]>(editing?.purposes ?? [])
  const [draft, setDraft] = useState('')
  const [showIcons, setShowIcons] = useState(!editing)

  const addDraft = () => {
    const n = draft.trim()
    if (!n) return
    if (purposes.some((p) => p.name.toLowerCase() === n.toLowerCase())) return toast('That purpose already exists', 'error')
    setPurposes((ps) => [...ps, { id: uid(), name: n }])
    setDraft('')
  }

  const removePurpose = async (p: Purpose) => {
    const used = transactions.filter((t) => t.purposeId === p.id).length
    if (used) {
      const { ok } = await confirm({ title: `Remove "${p.name}"?`, message: `${used} transactions use this purpose. They will stay in "${name || 'this category'}" without a purpose.`, confirmLabel: 'Remove' })
      if (!ok) return
    }
    setPurposes((ps) => ps.filter((x) => x.id !== p.id))
  }

  const save = () => {
    if (!name.trim()) return
    const clean = purposes.map((p) => ({ ...p, name: p.name.trim() })).filter((p) => p.name)
    const pending = draft.trim() && !clean.some((p) => p.name.toLowerCase() === draft.trim().toLowerCase()) ? [...clean, { id: uid(), name: draft.trim() }] : clean
    if (editing) {
      const removed = editing.purposes.filter((p) => !pending.some((x) => x.id === p.id))
      if (removed.length) {
        const ids = new Set(removed.map((p) => p.id))
        useStore.setState((s) => ({
          transactions: s.transactions.map((t) => (t.purposeId && ids.has(t.purposeId) ? { ...t, purposeId: undefined } : t)),
          shopItems: s.shopItems.map((t) => (t.purposeId && ids.has(t.purposeId) ? { ...t, purposeId: undefined } : t)),
          parties: s.parties.map((t) => (t.purposeId && ids.has(t.purposeId) ? { ...t, purposeId: undefined } : t)),
        }))
      }
      updateCategory(editing.id, { name: name.trim(), icon, color, purposes: pending })
      onSaved?.({ ...editing, name: name.trim(), icon, color, purposes: pending })
    } else {
      const c = addCategory({ name: name.trim(), icon, color, type: kind, purposes: pending })
      onSaved?.(c)
    }
    toast(editing ? 'Category updated' : 'Category added')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit category' : 'New category'}
      subtitle="Rename it, change its look, and manage its purposes"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button className="flex-1 sm:flex-none sm:ml-auto sm:min-w-28" size="lg" onClick={save} disabled={!name.trim()}>Save</Button></>}
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save() }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowIcons((v) => !v)} aria-label="Change icon"><IconBubble icon={icon} color={color} size="lg" /></button>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name, e.g. Home" autoFocus={!editing} />
        </div>
        {!editing && <Segmented className="w-full" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Purposes ({purposes.length})</span>
            <span className="text-[11px] text-muted">Tap a name to rename</span>
          </div>
          <div className="rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {purposes.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 pl-3 pr-1 bg-surface">
                <span className="num text-[11px] text-muted w-5">{i + 1}</span>
                <input
                  value={p.name}
                  onChange={(e) => setPurposes((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                  className="flex-1 min-w-0 h-11 bg-transparent outline-none text-base sm:text-sm font-medium"
                />
                <IconButton icon={Trash2} label="Remove purpose" onClick={() => removePurpose(p)} className="hover:text-expense" type="button" />
              </div>
            ))}
            <div className="flex items-center gap-2 pl-3 pr-1 bg-surface-2/60">
              <Plus className="size-4 text-primary" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft() } }}
                placeholder={editing?.id === 'wedding' || /wed/i.test(name) ? 'Add purpose, e.g. Mehendi' : 'Add purpose, e.g. Paint'}
                className="flex-1 min-w-0 h-11 bg-transparent outline-none text-base sm:text-sm"
              />
              <Button type="button" size="sm" variant="soft" onClick={addDraft} disabled={!draft.trim()}>Add</Button>
            </div>
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-muted mb-2">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className="grid place-items-center size-8 rounded-full transition hover:scale-110" style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined }}>
                {color === c && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        {showIcons ? (
          <div>
            <span className="block text-xs font-semibold text-muted mb-2">Icon</span>
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
              {Object.entries(CATEGORY_ICONS).map(([k, I]) => (
                <button key={k} type="button" onClick={() => setIcon(k)} className={cn('grid place-items-center aspect-square rounded-xl transition', icon === k ? '' : 'text-muted hover:bg-surface-2')} style={icon === k ? { background: tint(color, 0.16), color, boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}>
                  <I className="size-[18px]" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowIcons(true)} className="text-xs font-semibold text-primary">Change icon</button>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
