import { sortTx } from './selectors'
import type { AppData } from './types'

const download = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

const stamp = () => new Date().toISOString().slice(0, 10)

export const exportJSON = (data: AppData) =>
  download(JSON.stringify({ app: 'spendly', version: 1, exportedAt: new Date().toISOString(), data }, null, 2), `spendly-backup-${stamp()}.json`, 'application/json')

const esc = (v: string | number) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const exportCSV = (data: Pick<AppData, 'transactions' | 'categories' | 'events' | 'parties'>, filename = `spendly-transactions-${stamp()}.csv`) => {
  const cat = new Map(data.categories.map((c) => [c.id, c.name]))
  const ev = new Map(data.events.map((e) => [e.id, e.name]))
  const pa = new Map(data.parties.map((p) => [p.id, p.name]))
  const rows = [['Date', 'Type', 'Amount', 'Category', 'Note', 'Payment method', 'Event', 'Person / Vendor']]
  for (const t of sortTx(data.transactions))
    rows.push([t.date, t.type, String(t.amount), cat.get(t.categoryId) ?? '', t.note, t.method, t.eventId ? ev.get(t.eventId) ?? '' : '', t.partyId ? pa.get(t.partyId) ?? '' : ''])
  download('﻿' + rows.map((r) => r.map(esc).join(',')).join('\n'), filename, 'text/csv;charset=utf-8')
}

export const parseBackup = (text: string): AppData => {
  const parsed = JSON.parse(text)
  const data = parsed?.data ?? parsed
  if (!data || !Array.isArray(data.transactions)) throw new Error('This file is not a valid Spendly backup.')
  return data as AppData
}
