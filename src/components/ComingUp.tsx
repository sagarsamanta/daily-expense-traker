import { Link } from 'react-router-dom'
import { ArrowRight, BellPlus, BellRing, ShoppingBag } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { daysUntil } from '../lib/format'
import { ReminderCard } from './Reminders'
import { ShopItemCard } from './ShopItems'
import { Button, Card, CardHeader, EmptyState } from './ui'

export function ComingUp() {
  const { reminders, shopItems } = useStore()
  const openForm = useUI((s) => s.openForm)
  const rems = reminders.filter((r) => !r.done).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4)
  const buy = shopItems
    .filter((i) => i.status === 'pending' && i.needBy && daysUntil(i.needBy) <= 7)
    .sort((a, b) => (a.needBy ?? '').localeCompare(b.needBy ?? ''))
    .slice(0, 4)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 [&>*]:min-w-0">
      <Card>
        <CardHeader title="Reminders" subtitle="Coming up next" action={<Link to="/reminders" className="text-xs font-semibold text-primary inline-flex items-center gap-1">All <ArrowRight className="size-3" /></Link>} />
        <div className="px-3 pb-3 space-y-2">
          {rems.length ? rems.map((r) => <ReminderCard key={r.id} r={r} compact />) : (
            <EmptyState icon={BellRing} title="No reminders" text="Payments, calls, bookings — never miss them." action={<Button size="sm" icon={BellPlus} onClick={() => openForm({ kind: 'reminder' })}>Add reminder</Button>} />
          )}
        </div>
      </Card>
      <Card>
        <CardHeader title="To buy this week" subtitle="Due within 7 days" action={<Link to="/shopping" className="text-xs font-semibold text-primary inline-flex items-center gap-1">List <ArrowRight className="size-3" /></Link>} />
        <div className="px-3 pb-3 space-y-2">
          {buy.length ? buy.map((i) => <ShopItemCard key={i.id} item={i} />) : (
            <EmptyState icon={ShoppingBag} title="Nothing due soon" text="Items with a need-by date show up here." action={<Button size="sm" icon={ShoppingBag} onClick={() => openForm({ kind: 'shop' })}>Add item</Button>} />
          )}
        </div>
      </Card>
    </div>
  )
}
