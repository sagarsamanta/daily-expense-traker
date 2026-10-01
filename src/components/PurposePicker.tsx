import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Category } from '../lib/types'
import { CategoryForm } from './CategoryForm'
import { Chip } from './ui'

export function PurposePicker({ category, value, onChange }: { category?: Category; value?: string; onChange: (id: string | undefined) => void }) {
  const addPurpose = useStore((s) => s.addPurpose)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  if (!category) return null

  const commit = () => {
    const n = draft.trim()
    if (n) {
      const existing = category.purposes.find((p) => p.name.toLowerCase() === n.toLowerCase())
      onChange(existing ? existing.id : addPurpose(category.id, n))
    }
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="anim-fade">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted">Purpose <span className="font-normal">· {category.name}</span></span>
        <button type="button" onClick={() => setEditing(true)} className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"><Pencil className="size-3" /> Edit purposes</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {category.purposes.map((p) => (
          <Chip key={p.id} active={value === p.id} color={category.color} onClick={() => onChange(value === p.id ? undefined : p.id)}>
            {value === p.id && <Check className="size-3.5" strokeWidth={3} />}
            {p.name}
          </Chip>
        ))}
        {adding ? (
          <span className="inline-flex items-center h-9 rounded-full border border-primary pl-3 pr-1 gap-1 bg-surface">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commit() }
                if (e.key === 'Escape') { e.stopPropagation(); setAdding(false) }
              }}
              placeholder="New purpose"
              className="w-32 bg-transparent outline-none text-base sm:text-[13px]"
            />
            <button type="button" onClick={commit} className="grid place-items-center size-7 rounded-full bg-primary text-white" aria-label="Add"><Check className="size-3.5" /></button>
            <button type="button" onClick={() => setAdding(false)} className="grid place-items-center size-7 rounded-full text-muted" aria-label="Cancel"><X className="size-3.5" /></button>
          </span>
        ) : (
          <Chip onClick={() => setAdding(true)} className="border-dashed text-primary"><Plus className="size-3.5" /> New</Chip>
        )}
      </div>
      {editing && <CategoryForm editing={category} onClose={() => setEditing(false)} onSaved={(c) => { if (value && !c.purposes.some((p) => p.id === value)) onChange(undefined) }} />}
    </div>
  )
}
