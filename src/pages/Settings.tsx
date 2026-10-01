import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BellRing, ChevronRight, Database, Download, FileSpreadsheet, Monitor, Moon, Palette, Plus, Sparkles, Sun, Tags, Trash2, Upload, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { CURRENCIES } from '../lib/defaults'
import { currencySymbol } from '../lib/format'
import { exportCSV, exportJSON, parseBackup } from '../lib/exporters'
import type { Category, ThemeMode, TxType } from '../lib/types'
import { CategoryForm } from '../components/CategoryForm'
import { NotificationSetup } from './Reminders'
import { AmountInput, Button, Card, confirm, Field, IconBubble, IconButton, Input, PageHeader, Segmented, Select, Toggle } from '../components/ui'

function Section({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="grid place-items-center size-9 rounded-xl bg-primary-soft text-primary"><Icon className="size-[18px]" /></span>
        <div>
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function Settings() {
  const store = useStore()
  const { settings, updateSettings, categories, transactions, events, parties, contacts, shopItems, reminders, importData, loadSample, resetAll } = store
  const toast = useUI((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [budget, setBudget] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : '')
  const [catType, setCatType] = useState<TxType>('expense')
  const [catForm, setCatForm] = useState<{ editing?: Category } | null>(null)

  const onImport = async (file?: File) => {
    if (!file) return
    try {
      const data = parseBackup(await file.text())
      const { ok } = await confirm({ title: 'Restore this backup?', message: `It contains ${data.transactions.length} transactions, ${data.events?.length ?? 0} events and ${data.shopItems?.length ?? 0} shopping items. Your current data will be replaced.`, confirmLabel: 'Restore', tone: 'primary' })
      if (ok) { importData(data); toast('Backup restored') }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read file', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const themes: { value: ThemeMode; label: ReactNode }[] = [
    { value: 'light', label: <><Sun className="size-4" /> Light</> },
    { value: 'dark', label: <><Moon className="size-4" /> Dark</> },
    { value: 'system', label: <><Monitor className="size-4" /> Auto</> },
  ]

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Personalise Spendly and manage your data" />
      <div className="space-y-4 sm:space-y-5">
        <Section icon={User} title="Profile & preferences">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Your name"><Input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Shown in the greeting" /></Field>
            <Field label="Currency">
              <Select value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value, dialCode: CURRENCIES.find((c) => c.code === e.target.value)?.dial ?? settings.dialCode })}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{currencySymbol(c.code)} · {c.label} ({c.code})</option>)}
              </Select>
            </Field>
            <Field label="Country calling code" hint="Used for WhatsApp links to 10-digit numbers">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-semibold">+</span>
                <Input inputMode="numeric" value={settings.dialCode} onChange={(e) => updateSettings({ dialCode: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="pl-7" />
              </div>
            </Field>
            <Field label="Monthly budget for daily expenses" hint="Event spending (house, wedding…) is not counted.">
              <AmountInput value={budget} onChange={(v) => { setBudget(v); updateSettings({ monthlyBudget: parseFloat(v) || 0 }) }} currency={settings.currency} />
            </Field>
          </div>
        </Section>

        <Section icon={BellRing} title="Notifications" subtitle="Reminders, daily nudge and budget alerts">
          <div className="space-y-4">
            <NotificationSetup />
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <Toggle checked={settings.dailyLogReminder} onChange={(v) => updateSettings({ dailyLogReminder: v, dailyLogNotified: undefined })} label="Daily reminder to log expenses" hint="A nudge every evening so you never miss an entry" />
              {settings.dailyLogReminder && (
                <div className="flex items-center gap-3 anim-fade">
                  <span className="text-sm text-muted">Remind me at</span>
                  <Input type="time" value={settings.dailyLogTime} onChange={(e) => updateSettings({ dailyLogTime: e.target.value || '21:00', dailyLogNotified: undefined })} className="w-36" />
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-line p-4">
              <Toggle checked={settings.budgetAlerts} onChange={(v) => updateSettings({ budgetAlerts: v })} label="Budget alerts" hint={settings.monthlyBudget ? 'Notify at 80% and 100% of your monthly budget' : 'Set a monthly budget above to use this'} />
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Appearance">
          <Segmented value={settings.theme} onChange={(t) => updateSettings({ theme: t })} options={themes} />
        </Section>

        <Section icon={Tags} title="Categories & purposes" subtitle="Each category has its own purposes — rename, add or remove anything">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Segmented size="sm" value={catType} onChange={setCatType} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
            <Button size="sm" variant="soft" icon={Plus} onClick={() => setCatForm({})}>New category</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {categories.filter((c) => c.type === catType).map((c) => {
              const used = transactions.filter((t) => t.categoryId === c.id).length
              return (
                <div key={c.id} className="flex items-center gap-1 rounded-xl hover:bg-surface-2 transition">
                  <button onClick={() => setCatForm({ editing: c })} className="flex-1 min-w-0 flex items-center gap-3 p-2 text-left">
                    <IconBubble icon={c.icon} color={c.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[11px] text-muted truncate">{c.purposes.length ? `${c.purposes.length} purposes · ${c.purposes.slice(0, 3).map((p) => p.name).join(', ')}${c.purposes.length > 3 ? '…' : ''}` : 'No purposes'} · {used} entries</p>
                    </div>
                    <ChevronRight className="size-4 text-muted shrink-0" />
                  </button>
                  <IconButton icon={Trash2} label="Delete" className="size-8 hover:text-expense shrink-0" onClick={async () => {
                    if (categories.filter((x) => x.type === c.type).length <= 1) return toast('Keep at least one category', 'error')
                    const { ok } = await confirm({ title: `Delete "${c.name}"?`, message: used ? `${used} transactions will move to "Other".` : 'This category is not used yet.' })
                    if (ok) { store.deleteCategory(c.id); toast('Category deleted', 'info') }
                  }} />
                </div>
              )
            })}
          </div>
        </Section>

        <Section icon={Database} title="Your data" subtitle="Everything is saved in this browser only. Back it up regularly.">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5 text-center">
            {[['Entries', transactions.length], ['Events', events.length], ['People', parties.length], ['Contacts', contacts.length], ['To buy', shopItems.length], ['Reminders', reminders.length]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-surface-2 py-3"><p className="num text-lg font-extrabold">{v}</p><p className="text-[10px] text-muted font-semibold">{l}</p></div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Button variant="secondary" icon={Download} onClick={() => { exportJSON({ categories, transactions, events, parties, contacts, shopItems, reminders, settings }); toast('Backup downloaded') }}>Download backup (JSON)</Button>
            <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Restore from backup</Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => exportCSV({ transactions, categories, events, parties })} disabled={!transactions.length}>Export transactions to CSV</Button>
            <Button variant="secondary" icon={Sparkles} onClick={async () => {
              const { ok } = await confirm({ title: 'Load sample data?', message: 'Replaces your current data with demo transactions, a house construction, a wedding with shopping list, contacts and reminders.', confirmLabel: 'Load sample', tone: 'primary' })
              if (ok) { loadSample(); toast('Sample data loaded') }
            }}>Load sample data</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          <div className="mt-5 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-expense">Erase everything</p>
              <p className="text-xs text-muted">Deletes all data on this device. Cannot be undone.</p>
            </div>
            <Button variant="danger" icon={Trash2} size="sm" onClick={async () => {
              const { ok } = await confirm({ title: 'Erase all data?', message: 'Download a backup first if you might need it later.', confirmLabel: 'Erase everything' })
              if (ok) { resetAll(); setBudget(''); toast('All data erased', 'info') }
            }}>Erase all data</Button>
          </div>
        </Section>
        <p className="text-center text-xs text-muted pb-4">Spendly · Your data never leaves this device</p>
      </div>
      {catForm && <CategoryForm editing={catForm.editing} type={catType} onClose={() => setCatForm(null)} />}
    </div>
  )
}
