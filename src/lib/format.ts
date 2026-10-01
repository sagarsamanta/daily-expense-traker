const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => toISODate(new Date())
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export const monthKey = (s: string) => s.slice(0, 7)
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const startOfMonth = (d = new Date()) => toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
export const endOfMonth = (d = new Date()) => toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))

const cache = new Map<string, Intl.NumberFormat>()
const fmt = (currency: string, compact: boolean) => {
  const key = `${currency}-${compact}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    })
    cache.set(key, f)
  }
  return f
}

export const money = (n: number, currency: string, compact = false) => fmt(currency, compact).format(Math.round(n * 100) / 100)

export const currencySymbol = (currency: string) =>
  fmt(currency, false).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency

export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  parseDate(s).toLocaleDateString('en-GB', opts)

export const fmtMonth = (key: string, long = false) =>
  parseDate(`${key}-01`).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' })

export const relativeDay = (s: string) => {
  const t = today()
  if (s === t) return 'Today'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (s === toISODate(y)) return 'Yesterday'
  return fmtDate(s, { weekday: 'short', day: 'numeric', month: 'short', year: s.slice(0, 4) === t.slice(0, 4) ? undefined : 'numeric' })
}

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`)

export const pct = (part: number, whole: number) => (whole > 0 ? Math.min(999, (part / whole) * 100) : 0)

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)

export const toLocalDT = (d: Date) => `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
export const nowDT = () => toLocalDT(new Date())
export const parseDT = (s: string) => {
  const [date, time = '00:00'] = s.split('T')
  const d = parseDate(date)
  const [h, m] = time.split(':').map(Number)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

export const fmtTime = (s: string) => parseDT(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

export const fmtDateTime = (s: string) => `${relativeDay(s.slice(0, 10))}, ${fmtTime(s)}`

export const relativeTime = (s: string) => {
  const diff = parseDT(s).getTime() - Date.now()
  const abs = Math.abs(diff)
  const m = Math.round(abs / 60000)
  const label = m < 1 ? 'now' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} hr` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? '' : 's'}`
  if (label === 'now') return 'now'
  return diff > 0 ? `in ${label}` : `${label} ago`
}

export const daysUntil = (date: string) => Math.round((parseDate(date).getTime() - parseDate(today()).getTime()) / 864e5)

export const dueLabel = (date: string) => {
  const d = daysUntil(date)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d < 0) return `${-d} days overdue`
  if (d < 7) return `In ${d} days`
  return fmtDate(date, { day: 'numeric', month: 'short' })
}
