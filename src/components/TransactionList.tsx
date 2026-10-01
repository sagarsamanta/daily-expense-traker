import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { PAY_METHODS } from '../lib/icons'
import { money, relativeDay } from '../lib/format'
import { groupByDate, sortTx } from '../lib/selectors'
import type { Transaction } from '../lib/types'
import { Badge, Button, cn, IconBubble } from './ui'

export function TransactionRow({ t, showEvent = true }: { t: Transaction; showEvent?: boolean }) {
  const { categories, events, parties, settings } = useStore()
  const editTx = useUI((s) => s.editTx)
  const cat = categories.find((c) => c.id === t.categoryId)
  const ev = showEvent && t.eventId ? events.find((e) => e.id === t.eventId) : undefined
  const party = t.partyId ? parties.find((p) => p.id === t.partyId) : undefined
  const purpose = t.purposeId ? cat?.purposes.find((p) => p.id === t.purposeId) : undefined
  return (
    <button onClick={() => editTx(t)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition text-left group">
      <IconBubble icon={cat?.icon} color={cat?.color ?? '#94a3b8'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{t.note || purpose?.name || cat?.name || 'Transaction'}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5 min-w-0">
          <span className="truncate">{t.note ? (purpose ? `${cat?.name} · ${purpose.name}` : cat?.name) : purpose ? cat?.name : PAY_METHODS[t.method]?.label}</span>
          {party && <><span className="opacity-50">·</span><span className="truncate">{party.name}</span></>}
          {ev && <Badge color={ev.color} className="ml-0.5 max-w-36 truncate max-sm:hidden">{ev.name}</Badge>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('num text-sm font-bold', t.type === 'income' ? 'text-income' : 'text-ink')}>
          {t.type === 'income' ? '+' : '−'}{money(t.amount, settings.currency)}
        </p>
        {t.note && <p className="text-[11px] text-muted mt-0.5">{PAY_METHODS[t.method]?.label}</p>}
      </div>
    </button>
  )
}

export function TransactionList({ txs, showEvent = true, grouped = true, pageSize = 80, paginate = true }: { txs: Transaction[]; showEvent?: boolean; grouped?: boolean; pageSize?: number; paginate?: boolean }) {
  const currency = useStore((s) => s.settings.currency)
  const [limit, setLimit] = useState(pageSize)
  const sorted = useMemo(() => sortTx(txs).slice(0, limit), [txs, limit])
  const groups = useMemo(() => (grouped ? groupByDate(sorted) : []), [sorted, grouped])
  const more = paginate && txs.length > limit

  return (
    <div>
      {grouped ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="flex items-center justify-between px-3 pb-1.5 text-xs">
                <span className="font-bold text-muted uppercase tracking-wider text-[11px]">{relativeDay(g.date)}</span>
                <span className="num text-muted font-medium">
                  {g.expense > 0 && <span>−{money(g.expense, currency)}</span>}
                  {g.income > 0 && <span className="text-income ml-2">+{money(g.income, currency)}</span>}
                </span>
              </div>
              <div className="space-y-0.5">{g.items.map((t) => <TransactionRow key={t.id} t={t} showEvent={showEvent} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">{sorted.map((t) => <TransactionRow key={t.id} t={t} showEvent={showEvent} />)}</div>
      )}
      {more && (
        <div className="flex justify-center pt-4">
          <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
            Show more ({txs.length - limit} left)
          </Button>
        </div>
      )}
    </div>
  )
}
