import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeftRight, Bell, CalendarHeart, ChartPie, Contact, HandCoins, LayoutDashboard, LayoutGrid, Moon, Plus, Settings2, ShoppingBag, Sun, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useUI } from '../../store/useUI'
import { nowDT } from '../../lib/format'
import { useReminderEngine } from '../../hooks/useReminderEngine'
import { cn, ConfirmHost, IconButton, Modal, Toaster } from '../ui'
import { TransactionFormHost } from '../TransactionForm'
import { FormHost, QuickAddSheet } from '../Hosts'

type NavItem = { to: string; label: string; short: string; icon: LucideIcon; end?: boolean; badge?: 'reminders' | 'shopping' }

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', short: 'Transactions', icon: ArrowLeftRight },
  { to: '/events', label: 'Events & Projects', short: 'Events', icon: CalendarHeart },
  { to: '/shopping', label: 'Shopping list', short: 'Shopping', icon: ShoppingBag, badge: 'shopping' },
  { to: '/reminders', label: 'Reminders', short: 'Reminders', icon: Bell, badge: 'reminders' },
  { to: '/contacts', label: 'Contacts', short: 'Contacts', icon: Contact },
  { to: '/dues', label: 'Dues & Payments', short: 'Dues', icon: HandCoins },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: ChartPie },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings2 },
]

const byPath = (p: string) => NAV.find((n) => n.to === p)!
const MOBILE_LEFT = [byPath('/'), byPath('/events')]
const MOBILE_RIGHT = [byPath('/shopping')]
const MORE = ['/transactions', '/reminders', '/contacts', '/dues', '/reports', '/settings'].map(byPath)

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_20px_-6px] shadow-indigo-500/60">
        <Wallet className="size-[18px]" strokeWidth={2.3} />
      </span>
      <span className="text-lg font-extrabold tracking-tight">Spendly</span>
    </div>
  )
}

function useThemeSync() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0a0c11' : '#f5f6fa'))
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

function useBadges() {
  const reminders = useStore((s) => s.reminders)
  const shopItems = useStore((s) => s.shopItems)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])
  return useMemo(() => {
    const now = nowDT()
    const t = now.slice(0, 10)
    return {
      reminders: reminders.filter((r) => !r.done && r.at <= now).length,
      shopping: shopItems.filter((i) => i.status === 'pending' && i.needBy && i.needBy <= t).length,
      tick,
    }
  }, [reminders, shopItems, tick])
}

function ThemeToggle() {
  const { settings, updateSettings } = useStore()
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return <IconButton icon={isDark ? Sun : Moon} label="Toggle theme" onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })} />
}

const Dot = ({ n, className }: { n: number; className?: string }) =>
  n > 0 ? <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full bg-expense text-white text-[10px] font-bold grid place-items-center leading-none', className)}>{n > 9 ? '9+' : n}</span> : null

export function AppLayout() {
  useThemeSync()
  useReminderEngine()
  const { openTx, setQuickAdd } = useUI()
  const badges = useBadges()
  const { pathname } = useLocation()
  const [more, setMore] = useState(false)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setMore(false)
  }, [pathname])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('add') === 'expense') {
      openTx({ type: 'expense' })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [openTx])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
      const ui = useUI.getState()
      if (ui.txOpen || ui.form || ui.quickAdd) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        openTx()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTx])

  const moreActive = MORE.some((m) => pathname.startsWith(m.to))
  const badgeOf = (n: NavItem) => (n.badge ? badges[n.badge] : 0)

  return (
    <div className="min-h-dvh">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-line bg-surface/70 backdrop-blur-xl px-4 py-6 z-30">
        <div className="px-2 mb-7"><Logo /></div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => openTx()} className="flex-1 h-11 rounded-xl bg-primary text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px] shadow-primary/70 hover:brightness-110 active:scale-[0.98] transition">
            <Plus className="size-4" strokeWidth={2.6} /> Expense
            <kbd className="ml-1 text-[10px] font-bold bg-white/20 rounded px-1.5 py-0.5">N</kbd>
          </button>
          <button onClick={() => setQuickAdd(true)} aria-label="Add something else" title="Add shopping item, reminder, contact…" className="grid place-items-center size-11 rounded-xl border border-line bg-surface hover:bg-surface-2 transition">
            <LayoutGrid className="size-4" />
          </button>
        </div>
        <nav className="space-y-0.5 flex-1 overflow-y-auto scroll-thin">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-semibold transition', isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink hover:bg-surface-2')}>
              <n.icon className="size-[18px]" strokeWidth={2.1} /> <span className="flex-1">{n.label}</span>
              <Dot n={badgeOf(n)} />
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-2 pt-4 border-t border-line">
          <span className="text-[11px] text-muted">Data stays on this device</span>
          <ThemeToggle />
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-line/70 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-14 px-4">
          <NavLink to="/"><Logo /></NavLink>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <NavLink to="/reminders" aria-label="Reminders" className={({ isActive }) => cn('relative grid place-items-center size-10 rounded-xl', isActive ? 'text-primary bg-primary-soft' : 'text-muted')}>
              <Bell className="size-5" />
              <Dot n={badges.reminders} className="absolute top-0.5 right-0.5" />
            </NavLink>
          </div>
        </div>
      </header>

      <main className="lg:pl-64 overflow-x-clip">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16 items-center">
          {MOBILE_LEFT.map((n) => <MobileTab key={n.to} item={n} badge={badgeOf(n)} />)}
          <div className="grid place-items-center">
            <button onClick={() => setQuickAdd(true)} aria-label="Add" className="-mt-7 grid place-items-center size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_12px_28px_-8px] shadow-indigo-500/80 active:scale-95 transition ring-4 ring-bg">
              <Plus className="size-7" strokeWidth={2.6} />
            </button>
          </div>
          {MOBILE_RIGHT.map((n) => <MobileTab key={n.to} item={n} badge={badgeOf(n)} />)}
          <button onClick={() => setMore(true)} className={cn('relative flex flex-col items-center gap-1 text-[10px] font-semibold h-full justify-center', moreActive ? 'text-primary' : 'text-muted')}>
            <LayoutGrid className="size-5" strokeWidth={2.1} />
            More
            <Dot n={badges.reminders} className="absolute top-2 left-1/2 ml-2" />
          </button>
        </div>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-3 gap-2.5 pb-2">
          {MORE.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('relative flex flex-col items-center gap-2 py-4 rounded-2xl border transition active:scale-95', isActive ? 'bg-primary-soft border-transparent text-primary' : 'border-line hover:bg-surface-2')}>
              <n.icon className="size-6" strokeWidth={2} />
              <span className="text-xs font-semibold">{n.short}</span>
              <Dot n={badgeOf(n)} className="absolute top-2 right-2" />
            </NavLink>
          ))}
        </div>
      </Modal>

      <TransactionFormHost />
      <FormHost />
      <QuickAddSheet />
      <ConfirmHost />
      <Toaster />
    </div>
  )
}

function MobileTab({ item: { to, short, icon: Icon, end }, badge }: { item: NavItem; badge: number }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn('relative flex flex-col items-center gap-1 text-[10px] font-semibold transition h-full justify-center', isActive ? 'text-primary' : 'text-muted')}>
      <Icon className="size-5" strokeWidth={2.1} />
      {short}
      <Dot n={badge} className="absolute top-2 left-1/2 ml-2" />
    </NavLink>
  )
}
