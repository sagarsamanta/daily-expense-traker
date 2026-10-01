import { ArrowDownLeft, ArrowUpRight, BellPlus, CalendarHeart, ShoppingBag, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../store/useUI'
import { BuyDialog, ShopItemForm } from './ShopItems'
import { ReminderForm } from './Reminders'
import { ContactForm } from './Contacts'
import { IconBubble, Modal } from './ui'

export function FormHost() {
  const { form, closeForm } = useUI()
  if (!form) return null
  if (form.kind === 'shop') return <ShopItemForm key={form.editing?.id ?? 'new'} editing={form.editing} preset={form.preset} onClose={closeForm} />
  if (form.kind === 'reminder') return <ReminderForm key={form.editing?.id ?? 'new'} editing={form.editing} preset={form.preset} onClose={closeForm} />
  if (form.kind === 'contact') return <ContactForm key={form.editing?.id ?? 'new'} editing={form.editing} preset={form.preset} onClose={closeForm} />
  return <BuyDialog item={form.item} onClose={closeForm} />
}

export function QuickAddSheet() {
  const { quickAdd, setQuickAdd, openTx, openForm } = useUI()
  const navigate = useNavigate()
  const actions = [
    { label: 'Expense', text: 'Daily spend, bill, payment', icon: ArrowUpRight, color: '#e5484d', onClick: () => openTx({ type: 'expense' }) },
    { label: 'Income / received', text: 'Salary, gift, loan', icon: ArrowDownLeft, color: '#10a37f', onClick: () => openTx({ type: 'income' }) },
    { label: 'Shopping item', text: 'Something to buy later', icon: ShoppingBag, color: '#f97316', onClick: () => openForm({ kind: 'shop' }) },
    { label: 'Reminder', text: 'Get notified on time', icon: BellPlus, color: '#5b5ef4', onClick: () => openForm({ kind: 'reminder' }) },
    { label: 'Contact', text: 'Shop, vendor or person', icon: UserPlus, color: '#14b8a6', onClick: () => openForm({ kind: 'contact' }) },
    { label: 'Event', text: 'Wedding, house, trip…', icon: CalendarHeart, color: '#ec4899', onClick: () => { setQuickAdd(false); navigate('/events?new=1') } },
  ]
  return (
    <Modal open={quickAdd} onClose={() => setQuickAdd(false)} title="Add new" subtitle="What would you like to add?">
      <div className="grid grid-cols-2 gap-2.5 pb-2">
        {actions.map((a, i) => (
          <button key={a.label} onClick={a.onClick} className={`flex flex-col items-start gap-3 p-4 rounded-2xl border border-line hover:bg-surface-2 active:scale-[0.97] transition text-left anim-rise ${i === 0 ? 'col-span-2 flex-row items-center bg-primary-soft border-transparent' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
            <IconBubble lucide={a.icon} color={a.color} size={i === 0 ? 'lg' : 'md'} />
            <span>
              <span className="block font-bold text-[15px]">{a.label}</span>
              <span className="block text-xs text-muted mt-0.5">{a.text}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
