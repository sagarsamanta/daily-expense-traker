import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, PieChart as PieIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmtDate, fmtMonth, money, sum } from '../lib/format'
import { byCategory, byPurpose } from '../lib/selectors'
import { EVENT_KINDS, PAY_METHODS } from '../lib/icons'
import type { PayMethod } from '../lib/types'
import { BreakdownList, ChartTooltip, Donut } from '../components/charts'
import { Card, CardHeader, EmptyState, IconBubble, IconButton, PageHeader, Segmented } from '../components/ui'

export default function Reports() {
  const { transactions, categories, events, settings } = useStore()
  const cur = settings.currency
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | 'all'>('all')
  const [scope, setScope] = useState<'all' | 'daily' | 'events'>('all')
  const [breakdown, setBreakdown] = useState<'category' | 'purpose'>('category')
  const [catFilter, setCatFilter] = useState('')

  const r = useMemo(() => {
    const y = String(year)
    const prefix = month === 'all' ? y : `${y}-${String(month + 1).padStart(2, '0')}`
    const scoped = transactions.filter((t) => t.date.startsWith(prefix) && (scope === 'all' || (scope === 'daily' ? !t.eventId : !!t.eventId)))
    const exp = scoped.filter((t) => t.type === 'expense')
    const inc = scoped.filter((t) => t.type === 'income')
    const spent = sum(exp, (t) => t.amount)
    const income = sum(inc, (t) => t.amount)

    const bars = month === 'all'
      ? Array.from({ length: 12 }, (_, i) => {
          const k = `${y}-${String(i + 1).padStart(2, '0')}`
          const m = scoped.filter((t) => t.date.startsWith(k))
          return { key: k, label: fmtMonth(k).split(' ')[0], Expense: sum(m.filter((t) => t.type === 'expense'), (t) => t.amount), Income: sum(m.filter((t) => t.type === 'income'), (t) => t.amount) }
        })
      : Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
          const k = `${prefix}-${String(i + 1).padStart(2, '0')}`
          const d = scoped.filter((t) => t.date === k)
          return { key: k, label: String(i + 1), Expense: sum(d.filter((t) => t.type === 'expense'), (t) => t.amount), Income: sum(d.filter((t) => t.type === 'income'), (t) => t.amount) }
        })

    const now = new Date()
    const isCurrent = year === now.getFullYear() && (month === 'all' || month === now.getMonth())
    const days = month === 'all'
      ? (isCurrent ? Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / 864e5) : (year % 4 === 0 ? 366 : 365))
      : isCurrent ? now.getDate() : new Date(year, month + 1, 0).getDate()

    const dayTotals = new Map<string, number>()
    for (const t of exp) dayTotals.set(t.date, (dayTotals.get(t.date) ?? 0) + t.amount)
    const topDay = [...dayTotals.entries()].sort((a, b) => b[1] - a[1])[0]

    const methods = (Object.keys(PAY_METHODS) as PayMethod[])
      .map((m) => ({ id: m, name: PAY_METHODS[m].label, value: sum(exp.filter((t) => t.method === m), (t) => t.amount) }))
      .filter((m) => m.value > 0)
      .sort((a, b) => b.value - a.value)

    const byEvent = events
      .map((e) => ({ e, value: sum(exp.filter((t) => t.eventId === e.id), (t) => t.amount) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
    const daily = sum(exp.filter((t) => !t.eventId), (t) => t.amount)

    return { spent, income, bars, cats: breakdown === 'purpose' ? byPurpose(catFilter ? exp.filter((t) => t.categoryId === catFilter) : exp, categories) : byCategory(exp, categories), catTotal: catFilter && breakdown === 'purpose' ? sum(exp.filter((t) => t.categoryId === catFilter), (t) => t.amount) : spent, incomeCats: byCategory(inc, categories), avg: days > 0 ? spent / days : 0, topDay, methods, byEvent, daily, count: scoped.length }
  }, [transactions, categories, events, year, month, scope, breakdown, catFilter])

  const methodColors = ['#5b5ef4', '#10b981', '#f97316', '#0ea5e9', '#ec4899', '#64748b']
  const savings = r.income > 0 ? ((r.income - r.spent) / r.income) * 100 : null

  return (
    <div>
      <PageHeader title="Reports" subtitle="Understand where your money goes" />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-surface border border-line rounded-xl p-1">
          <IconButton icon={ChevronLeft} label="Previous year" onClick={() => setYear((y) => y - 1)} className="size-8" />
          <span className="num font-bold text-sm w-12 text-center">{year}</span>
          <IconButton icon={ChevronRight} label="Next year" onClick={() => setYear((y) => y + 1)} className="size-8" />
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="h-10 px-3 rounded-xl bg-surface border border-line text-sm font-semibold outline-none cursor-pointer">
          <option value="all">Whole year</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>)}
        </select>
        <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'all', label: 'All' }, { value: 'daily', label: 'Daily only' }, { value: 'events', label: 'Events only' }]} />
      </div>

      {r.count === 0 ? (
        <Card><EmptyState icon={PieIcon} title="No data for this period" text="Pick a different year or month." /></Card>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Total spent', value: money(r.spent, cur), sub: `${r.cats.length} categories` },
              { label: 'Total income', value: money(r.income, cur), sub: savings === null ? '—' : savings >= 0 ? `${savings.toFixed(0)}% saved` : `Spent ${money(r.spent - r.income, cur, true)} more than earned`, cls: 'text-income' },
              { label: 'Daily average', value: money(Math.round(r.avg), cur), sub: 'Spending per day' },
              { label: 'Highest day', value: r.topDay ? money(r.topDay[1], cur) : '—', sub: r.topDay ? fmtDate(r.topDay[0]) : '' },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-[11px] text-muted font-semibold uppercase tracking-wider">{s.label}</p>
                <p className={`num text-lg sm:text-2xl font-extrabold tracking-tight mt-1 truncate ${s.cls ?? ''}`}>{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.sub}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title={month === 'all' ? 'Month by month' : 'Day by day'} subtitle="Income vs expense" />
            <div className="h-72 px-2 pb-4">
              <ResponsiveContainer>
                <BarChart data={r.bars} margin={{ left: 0, right: 12, top: 8 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={month === 'all' ? 0 : 'preserveStartEnd'} />
                  <YAxis tickFormatter={(v) => money(v, cur, true)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={56} />
                  <Tooltip content={<ChartTooltip currency={cur} labelFormatter={(l) => (month === 'all' ? `${l} ${year}` : `${l} ${new Date(year, month as number, 1).toLocaleDateString('en-GB', { month: 'short' })}`)} />} cursor={{ fill: 'var(--surface-2)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="Expense" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Income" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            <Card>
              <CardHeader title={breakdown === 'purpose' ? 'Expenses by purpose' : 'Expenses by category'} action={<Segmented size="sm" value={breakdown} onChange={setBreakdown} options={[{ value: 'category', label: 'Category' }, { value: 'purpose', label: 'Purpose' }]} />} />
              {breakdown === 'purpose' && (
                <div className="px-5 pb-3">
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 px-3 rounded-xl bg-surface-2 text-sm font-semibold outline-none w-full sm:w-auto">
                    <option value="">All categories</option>
                    {categories.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="px-5 pb-5">
                {r.cats.length ? (
                  <div className="grid sm:grid-cols-[180px_1fr] gap-5 items-center">
                    <Donut data={r.cats.slice(0, 10)} currency={cur} centerLabel="Spent" centerValue={money(r.catTotal, cur, true)} height={180} />
                    <BreakdownList items={r.cats} currency={cur} total={r.catTotal} limit={12} />
                  </div>
                ) : <p className="text-sm text-muted py-6 text-center">No expenses</p>}
              </div>
            </Card>
            <div className="space-y-4 sm:space-y-5">
              <Card>
                <CardHeader title="Daily life vs events" />
                <div className="px-5 pb-5 space-y-3">
                  {[{ e: undefined, value: r.daily }, ...r.byEvent].filter((x) => x.value > 0).map((x) => {
                    const color = x.e?.color ?? '#5b5ef4'
                    return (
                      <div key={x.e?.id ?? 'daily'} className="flex items-center gap-3">
                        <IconBubble lucide={x.e ? EVENT_KINDS[x.e.kind].icon : undefined} icon="wallet" color={color} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm gap-2"><span className="font-semibold truncate">{x.e?.name ?? 'Daily expenses'}</span><span className="num font-bold">{money(x.value, cur)}</span></div>
                          <div className="h-1.5 rounded-full bg-surface-3 mt-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(x.value / r.spent) * 100}%`, background: color }} /></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
              <Card>
                <CardHeader title="Payment methods" />
                <div className="px-5 pb-5">
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {r.methods.map((m, i) => <div key={m.id} style={{ width: `${(m.value / r.spent) * 100}%`, background: methodColors[i % methodColors.length] }} />)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                    {r.methods.map((m, i) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted"><span className="size-2.5 rounded-full" style={{ background: methodColors[i % methodColors.length] }} />{m.name}</span>
                        <span className="num font-semibold">{money(m.value, cur, true)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              {r.incomeCats.length > 0 && (
                <Card>
                  <CardHeader title="Income sources" />
                  <div className="px-5 pb-5"><BreakdownList items={r.incomeCats} currency={cur} total={r.income} limit={5} /></div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
