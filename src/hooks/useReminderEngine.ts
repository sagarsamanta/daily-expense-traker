import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { endOfMonth, money, nowDT, parseDT, startOfMonth, sum, today } from '../lib/format'
import { nextOccurrence, showNotification } from '../lib/notify'
import type { Reminder } from '../lib/types'

const urlFor = (r: Reminder) => (r.eventId ? `/events/${r.eventId}` : r.shopItemId ? '/shopping' : '/reminders')

export function useReminderEngine() {
  const navigate = useNavigate()

  useEffect(() => {
    const go = (url: string) => navigate(url)
    const onSW = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && typeof e.data.url === 'string') go(e.data.url)
    }
    const onWin = (e: Event) => go((e as CustomEvent<string>).detail)
    navigator.serviceWorker?.addEventListener('message', onSW)
    window.addEventListener('spendly:navigate', onWin)

    const alert = (title: string, body: string, url: string, tag: string) => {
      void showNotification(title, body, url, tag)
      if (document.visibilityState === 'visible') {
        navigator.vibrate?.([120, 60, 120])
        useUI.getState().toast(title, 'info', { label: 'View', onClick: () => go(url) })
      }
    }

    const tick = () => {
      const s = useStore.getState()
      const now = nowDT()
      for (const r of s.reminders) {
        if (r.done || r.at > now || r.notified === r.at) continue
        const late = Date.now() - parseDT(r.at).getTime() > 15 * 60000
        const ev = r.eventId ? s.events.find((e) => e.id === r.eventId) : undefined
        const body = [late ? 'Missed reminder' : '', r.note, ev?.name].filter(Boolean).join(' · ') || 'Tap to open'
        alert(`⏰ ${r.title}`, body, urlFor(r), r.id)
        if (r.repeat !== 'none') {
          let next = nextOccurrence(r.at, r.repeat)
          while (next <= now) next = nextOccurrence(next, r.repeat)
          s.updateReminder(r.id, { at: next, notified: r.at })
        } else s.updateReminder(r.id, { notified: r.at })
      }

      const set = s.settings
      const t = today()
      if (set.dailyLogReminder && now.slice(11) >= set.dailyLogTime && set.dailyLogNotified !== t) {
        const todays = s.transactions.filter((x) => x.date === t && x.type === 'expense')
        const body = todays.length
          ? `You logged ${todays.length} expense${todays.length === 1 ? '' : 's'} today (${money(sum(todays, (x) => x.amount), set.currency)}). Anything missing?`
          : 'Nothing logged today yet — add today\'s spends in a few taps.'
        alert('📝 Log today\'s expenses', body, '/transactions', 'daily-log')
        s.updateSettings({ dailyLogNotified: t })
      }

      if (set.budgetAlerts && set.monthlyBudget > 0) {
        const m = t.slice(0, 7)
        const spent = sum(s.transactions.filter((x) => x.type === 'expense' && !x.eventId && x.date >= startOfMonth() && x.date <= endOfMonth()), (x) => x.amount)
        const pct = (spent / set.monthlyBudget) * 100
        const key = pct >= 100 ? `${m}:100` : pct >= 80 ? `${m}:80` : ''
        if (key && set.budgetAlerted !== key && !(key.endsWith(':80') && set.budgetAlerted === `${m}:100`)) {
          alert(pct >= 100 ? '⚠️ Monthly budget crossed' : '⚠️ 80% of monthly budget used', `${money(spent, set.currency)} of ${money(set.monthlyBudget, set.currency)} spent on daily expenses this month.`, '/', 'budget')
          s.updateSettings({ budgetAlerted: key })
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 15000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
      navigator.serviceWorker?.removeEventListener('message', onSW)
      window.removeEventListener('spendly:navigate', onWin)
    }
  }, [navigate])
}
