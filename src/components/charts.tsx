import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { money } from '../lib/format'
import { IconBubble } from './ui'

interface TipProps { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: { fill?: string; color?: string } }[]; label?: string | number; currency: string; labelFormatter?: (l: string) => string }

export function ChartTooltip({ active, payload, label, currency, labelFormatter }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-pop text-xs min-w-32">
      {label !== undefined && <p className="font-bold mb-1">{labelFormatter ? labelFormatter(String(label)) : label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full" style={{ background: p.color ?? p.payload?.color ?? p.payload?.fill }} />
            {p.name}
          </span>
          <span className="num font-bold">{money(p.value ?? 0, currency)}</span>
        </div>
      ))}
    </div>
  )
}

export function Donut({ data, currency, centerLabel, centerValue, height = 200 }: { data: { name: string; value: number; color: string }[]; currency: string; centerLabel?: string; centerValue?: string; height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={data.length > 1 ? 2 : 0} cornerRadius={6} stroke="none" isAnimationActive animationDuration={700}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-[11px] text-muted font-medium">{centerLabel}</p>
            <p className="num text-lg font-extrabold tracking-tight">{centerValue}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function BreakdownList({ items, currency, total, limit = 6 }: { items: { id: string; name: string; value: number; color: string; icon: string }[]; currency: string; total: number; limit?: number }) {
  return (
    <div className="space-y-3">
      {items.slice(0, limit).map((c) => {
        const p = total > 0 ? (c.value / total) * 100 : 0
        return (
          <div key={c.id} className="flex items-center gap-3">
            <IconBubble icon={c.icon} color={c.color} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold truncate">{c.name}</span>
                <span className="num font-bold shrink-0">{money(c.value, currency)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${p}%`, background: c.color }} />
                </div>
                <span className="num text-[11px] text-muted w-9 text-right">{p.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
