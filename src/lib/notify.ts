import { parseDT, toLocalDT } from './format'
import type { Reminder, Repeat } from './types'

export type PermissionState = NotificationPermission | 'unsupported'

export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const notifPermission = (): PermissionState => (notifSupported() ? Notification.permission : 'unsupported')

export const requestNotifPermission = async (): Promise<PermissionState> => {
  if (!notifSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export const showNotification = async (title: string, body: string, url = '/', tag?: string) => {
  if (notifPermission() !== 'granted') return false
  const options: NotificationOptions & { vibrate?: number[] } = { body, tag, icon: '/icon-192.png', badge: '/icon-192.png', data: { url }, vibrate: [200, 100, 200] }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const n = new Notification(title, options)
    n.onclick = () => {
      window.focus()
      window.dispatchEvent(new CustomEvent('spendly:navigate', { detail: url }))
      n.close()
    }
    return true
  } catch {
    return false
  }
}

export const nextOccurrence = (at: string, repeat: Repeat) => {
  const d = parseDT(at)
  if (repeat === 'daily') d.setDate(d.getDate() + 1)
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (repeat === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return toLocalDT(d)
}

export const REPEAT_LABELS: Record<Repeat, string> = { none: 'Once', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' }

const icsDate = (s: string) => s.replace(/[-:]/g, '') + '00'
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const RRULE: Partial<Record<Repeat, string>> = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }

export const downloadICS = (r: Pick<Reminder, 'id' | 'title' | 'note' | 'at' | 'repeat'>) => {
  const end = toLocalDT(new Date(parseDT(r.at).getTime() + 15 * 60000))
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spendly//Reminders//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${r.id}@spendly`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${icsDate(r.at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(r.title)}`,
    r.note ? `DESCRIPTION:${icsEscape(r.note)}` : '',
    RRULE[r.repeat] ? `RRULE:FREQ=${RRULE[r.repeat]}` : '',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(r.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.title.replace(/\W+/g, '-').toLowerCase() || 'reminder'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const googleCalendarHref = (r: Pick<Reminder, 'title' | 'note' | 'at' | 'repeat'>) => {
  const end = toLocalDT(new Date(parseDT(r.at).getTime() + 15 * 60000))
  const p = new URLSearchParams({ action: 'TEMPLATE', text: r.title, details: r.note, dates: `${icsDate(r.at)}/${icsDate(end)}` })
  if (RRULE[r.repeat]) p.set('recur', `RRULE:FREQ=${RRULE[r.repeat]}`)
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}
