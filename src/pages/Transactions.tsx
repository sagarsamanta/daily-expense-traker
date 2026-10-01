import { useMemo, useState } from 'react'
import { Download, Plus, Search, SlidersHorizontal, Wallet, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { addMonths, endOfMonth, money, startOfMonth, sum, today } from '../lib/format'
import { inRange } from '../lib/selectors'
import { exportCSV } from '../lib/exporters'
import { PAY_METHODS } from '../lib/icons'
import type { PayMethod } from '../lib/types'
import { TransactionList } from '../components/TransactionList'
import { Button, Card, cn, EmptyState, Field, Input, PageHeader, Segmented, Select } from '../components/ui'

type Period = 'month' | 'last' | 'year' | 'all' | 'custom'

export default function Transactions() {
  const { transactions, categories, events, parties, settings } = useStore()
  const openTx = useUI((s) => s.openTx)
  const cur = settings.currency
  const [period, setPeriod] = useState<Period>('month')
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'expense' | 'income'>('all')
  const [cat, setCat] = useState('')
  const [ev, setEv] = useState('')
  const [method, setMethod] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const range = useMemo((): [string | undefined, string | undefined] => {
    const now = new Date()
    if (period === 'month') return [startOfMonth(now), endOfMonth(now)]
    if (period === 'last') return [startOfMonth(addMonths(now, -1)), endOfMonth(addMonths(now, -1))]
    if (period === 'year') return [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`]
    if (period === 'custom') return [from || undefined, to || undefined]
    return [undefined, undefined]
  }, [period, from, to])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]))
    const partyName = new Map(parties.map((p) => [p.id, p.name.toLowerCase()]))
    return transactions.filter((t) => {
      if (!inRange(t, range[0], range[1])) return false
      if (type !== 'all' && t.type !== type) return false
      if (cat && t.categoryId !== cat) return false
      if (ev === 'none' ? !!t.eventId : ev && t.eventId !== ev) return false
      if (method && t.method !== method) return false
      if (needle) {
        const purpose = t.purposeId ? categories.find((c) => c.id === t.categoryId)?.purposes.find((x) => x.id === t.purposeId)?.name ?? '' : ''
        const hay = `${t.note} ${catName.get(t.categoryId) ?? ''} ${purpose} ${t.partyId ? partyName.get(t.partyId) ?? '' : ''} ${t.amount}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [transactions, categories, parties, range, type, cat, ev, method, q])

  const spent = sum(filtered.filter((t) => t.type === 'expense'), (t) => t.amount)
  const income = sum(filtered.filter((t) => t.type === 'income'), (t) => t.amount)
  const activeFilters = [type !== 'all', !!cat, !!ev, !!method].filter(Boolean).length
  const clear = () => { setType('all'); setCat(''); setEv(''); setMethod(''); setQ('') }

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={() => exportCSV({ transactions: filtered, categories, events, parties })} disabled={!filtered.length}>
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button icon={Plus} onClick={() => openTx()} className="max-sm:hidden">Add</Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 mb-4">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Segmented<Period>
            value={period}
            onChange={setPeriod}
            options={[{ value: 'month', label: 'This month' }, { value: 'last', label: 'Last month' }, { value: 'year', label: 'This year' }, { value: 'all', label: 'All time' }, { value: 'custom', label: 'Custom' }]}
          />
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search note, purpose, person, amount…" className="pl-10 bg-surface border-line" />
          </div>
          <Button variant={showFilters || activeFilters ? 'soft' : 'secondary'} icon={SlidersHorizontal} onClick={() => setShowFilters((v) => !v)} className="h-11">
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && <span className="grid place-items-center size-5 rounded-full bg-primary text-white text-[10px]">{activeFilters}</span>}
          </Button>
        </div>
        {showFilters && (
          <Card className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 anim-pop">
            <Field label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="all">All</option><option value="expense">Expense</option><option value="income">Income</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All categories</option>
                {categories.filter((c) => type === 'all' || c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Event">
              <Select value={ev} onChange={(e) => setEv(e.target.value)}>
                <option value="">All</option>
                <option value="none">Daily (no event)</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Paid via">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Any method</option>
                {(Object.keys(PAY_METHODS) as PayMethod[]).map((m) => <option key={m} value={m}>{PAY_METHODS[m].label}</option>)}
              </Select>
            </Field>
            {(activeFilters > 0 || q) && (
              <button onClick={clear} className="col-span-2 lg:col-span-4 justify-self-start text-xs font-semibold text-primary inline-flex items-center gap-1"><X className="size-3.5" /> Clear filters</button>
            )}
          </Card>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Spent', value: spent, cls: 'text-ink' },
          { label: 'Received', value: income, cls: 'text-income' },
          { label: 'Net', value: income - spent, cls: income - spent < 0 ? 'text-expense' : 'text-income' },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3">
            <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">{s.label}</p>
            <p className={cn('num font-extrabold text-base sm:text-xl tracking-tight mt-0.5 truncate', s.cls)}>{s.value < 0 ? '−' : ''}{money(Math.abs(s.value), cur)}</p>
          </Card>
        ))}
      </div>

      <Card className="p-2 sm:p-3">
        {filtered.length ? (
          <TransactionList key={`${period}-${type}-${cat}-${ev}-${method}-${q}`} txs={filtered} />
        ) : (
          <EmptyState
            icon={Wallet}
            title={transactions.length ? 'No matching transactions' : 'No transactions yet'}
            text={transactions.length ? 'Try a different period or clear the filters.' : 'Tap + to log your first expense.'}
            action={transactions.length ? <Button variant="secondary" size="sm" onClick={() => { clear(); setPeriod('all') }}>Show everything</Button> : <Button size="sm" icon={Plus} onClick={() => openTx()}>Add expense</Button>}
          />
        )}
      </Card>
    </div>
  )
}
