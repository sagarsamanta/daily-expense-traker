import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { AlertTriangle, CheckCircle2, ChevronDown, Info, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { categoryIcon } from '../lib/icons'
import { currencySymbol } from '../lib/format'
import { useUI } from '../store/useUI'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export const tint = (hex: string, alpha = 0.12) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
const btnBase = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-primary text-white shadow-[0_6px_20px_-6px] shadow-primary/60 hover:brightness-110',
  secondary: 'bg-surface border border-line text-ink hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-expense text-white hover:brightness-110',
  soft: 'bg-primary-soft text-primary hover:brightness-95 dark:hover:brightness-125',
}
const btnSizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-[15px]' }

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: keyof typeof btnSizes; icon?: LucideIcon }) {
  return (
    <button className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...rest}>
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.25} />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button aria-label={label} title={label} className={cn('inline-grid place-items-center size-9 rounded-xl text-muted hover:text-ink hover:bg-surface-2 transition active:scale-95', className)} {...rest}>
      <Icon className="size-[18px]" strokeWidth={2} />
    </button>
  )
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-surface border border-line rounded-2xl shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h3 className="font-bold text-[15px] tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const fieldCls = 'w-full h-12 sm:h-11 px-3.5 rounded-xl bg-surface-2 border border-transparent text-base sm:text-sm text-ink placeholder:text-muted/70 outline-none transition focus:bg-surface focus:border-primary/60 focus:ring-4 focus:ring-primary/10'

export function Field({ label, hint, children, className }: { label?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-muted mt-1.5">{hint}</span>}
    </label>
  )
}

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(fieldCls, className)} {...rest} />

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldCls, 'h-auto min-h-20 py-3 resize-none', className)} {...rest} />
)

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldCls, 'appearance-none pr-9 cursor-pointer', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="size-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

export function AmountInput({ value, onChange, currency, autoFocus, tone = 'ink', placeholder = '0' }: { value: string; onChange: (v: string) => void; currency: string; autoFocus?: boolean; tone?: 'ink' | 'income' | 'expense'; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus && window.matchMedia('(min-width: 640px)').matches) ref.current?.focus()
  }, [autoFocus])
  return (
    <div className="flex items-baseline gap-1.5 rounded-2xl bg-surface-2 px-4 py-3 focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-surface border border-transparent focus-within:border-primary/50 transition">
      <span className="text-xl font-semibold text-muted">{currencySymbol(currency)}</span>
      <input
        ref={ref}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
        className={cn('num w-full bg-transparent outline-none text-3xl font-bold tracking-tight placeholder:text-muted/40', tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-ink' : 'text-ink')}
      />
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex p-1 rounded-xl bg-surface-2 gap-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg font-semibold transition-all whitespace-nowrap inline-flex items-center justify-center gap-1.5',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, color, className, warn = true }: { value: number; color?: string; className?: string; warn?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  const over = warn && value > 100
  return (
    <div className={cn('h-2 rounded-full bg-surface-3 overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${v}%`, background: over ? 'var(--expense)' : warn && value > 85 ? 'var(--due)' : color ?? 'var(--primary)' }}
      />
    </div>
  )
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap', !color && 'bg-surface-2 text-muted', className)}
      style={color ? { background: tint(color, 0.14), color } : undefined}
    >
      {children}
    </span>
  )
}

export function IconBubble({ icon, color, size = 'md', lucide: L }: { icon?: string; color: string; size?: 'sm' | 'md' | 'lg'; lucide?: LucideIcon }) {
  const Icon = L ?? categoryIcon(icon ?? 'tag')
  const s = size === 'sm' ? 'size-8 rounded-lg' : size === 'lg' ? 'size-12 rounded-2xl' : 'size-10 rounded-xl'
  return (
    <span className={cn('grid place-items-center shrink-0', s)} style={{ background: tint(color, 0.14), color }}>
      <Icon className={size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.1} />
    </span>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl" />
        <div className="relative grid place-items-center size-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-pop">
          <Icon className="size-7" strokeWidth={2} />
        </div>
      </div>
      <h3 className="font-bold text-base">{title}</h3>
      {text && <p className="text-sm text-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const modalStack: string[] = []

export function Modal({ open, onClose, title, subtitle, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    modalStack.push(titleId)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === titleId) onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      modalStack.splice(modalStack.indexOf(titleId), 1)
      if (!modalStack.length) document.body.style.overflow = ''
    }
  }, [open, onClose, titleId])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px] anim-fade" onClick={onClose} />
      <div className={cn('relative w-full bg-surface sm:rounded-3xl rounded-t-3xl shadow-pop anim-sheet flex flex-col max-h-[92dvh] sm:max-h-[88dvh] border border-line', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-surface-3" />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 sm:pt-6 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto scroll-thin flex-1">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmOpts { title: string; message?: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; checkbox?: string }
interface ConfirmState { opts?: ConfirmOpts; resolve?: (v: { ok: boolean; checked: boolean }) => void }
const useConfirmStore = create<ConfirmState>()(() => ({}))

export const confirm = (opts: ConfirmOpts) =>
  new Promise<{ ok: boolean; checked: boolean }>((resolve) => useConfirmStore.setState({ opts, resolve }))

export function ConfirmHost() {
  const { opts, resolve } = useConfirmStore()
  const [checked, setChecked] = useState(false)
  const close = (ok: boolean) => {
    resolve?.({ ok, checked })
    setChecked(false)
    useConfirmStore.setState({ opts: undefined, resolve: undefined })
  }
  if (!opts) return null
  return (
    <Modal
      open
      onClose={() => close(false)}
      title={
        <span className="flex items-center gap-2.5">
          <span className={cn('grid place-items-center size-8 rounded-lg', opts.tone === 'primary' ? 'bg-primary-soft text-primary' : 'bg-expense/12 text-expense')}>
            <AlertTriangle className="size-4" />
          </span>
          {opts.title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={() => close(false)}>Cancel</Button>
          <Button variant={opts.tone === 'primary' ? 'primary' : 'danger'} className="flex-1" onClick={() => close(true)}>{opts.confirmLabel ?? 'Delete'}</Button>
        </>
      }
    >
      {opts.message && <div className="text-sm text-muted leading-relaxed">{opts.message}</div>}
      {opts.checkbox && (
        <label className="mt-4 flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="size-4 accent-[var(--expense)]" />
          {opts.checkbox}
        </label>
      )}
    </Modal>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useUI()
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.tone === 'error' ? XCircle : t.tone === 'info' ? Info : CheckCircle2
        return (
          <div key={t.id} className="pointer-events-auto anim-toast flex items-center gap-3 rounded-2xl bg-slate-900 text-white dark:bg-surface-3 dark:text-ink pl-4 pr-2 py-2.5 shadow-pop">
            <Icon className={cn('size-[18px] shrink-0', t.tone === 'error' ? 'text-rose-400' : t.tone === 'info' ? 'text-sky-400' : 'text-emerald-400')} />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            {t.action && (
              <button className="text-sm font-bold text-indigo-300 dark:text-primary px-2 py-1 rounded-lg hover:bg-white/10" onClick={() => { t.action?.onClick(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Chip({ active, onClick, children, color, className }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border transition active:scale-95 whitespace-nowrap shrink-0', active ? 'border-transparent' : 'border-line text-muted hover:bg-surface-2', className)}
      style={active ? { background: tint(color ?? '#5b5ef4', 0.14), color: color ?? 'var(--primary)', boxShadow: `inset 0 0 0 1.5px ${color ?? 'var(--primary)'}` } : undefined}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer select-none py-1">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
      <span className={cn('relative shrink-0 w-11 h-6.5 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-surface-3')}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn('absolute top-0.5 left-0.5 size-5.5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-[18px]')} />
      </span>
    </label>
  )
}
