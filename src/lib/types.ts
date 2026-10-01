export type TxType = 'expense' | 'income'
export type PayMethod = 'cash' | 'upi' | 'card' | 'bank' | 'cheque' | 'other'
export type EventKind = 'home' | 'wedding' | 'travel' | 'festival' | 'business' | 'education' | 'medical' | 'other'
export type PartyDirection = 'pay' | 'receive'
export type ThemeMode = 'light' | 'dark' | 'system'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ContactKind = 'shop' | 'person' | 'service'
export type Priority = 'low' | 'medium' | 'high'

export interface Purpose {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: TxType
  purposes: Purpose[]
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  date: string
  categoryId: string
  purposeId?: string
  note: string
  method: PayMethod
  eventId?: string
  partyId?: string
  createdAt: number
}

export interface EventItem {
  id: string
  name: string
  kind: EventKind
  budget: number
  startDate: string
  endDate?: string
  notes: string
  status: 'active' | 'completed'
  color: string
  createdAt: number
}

export interface Party {
  id: string
  eventId: string
  name: string
  role: string
  phone: string
  direction: PartyDirection
  agreedAmount: number
  categoryId?: string
  purposeId?: string
  notes: string
  createdAt: number
}

export interface Contact {
  id: string
  name: string
  kind: ContactKind
  phone: string
  altPhone: string
  address: string
  notes: string
  createdAt: number
}

export interface ShopItem {
  id: string
  name: string
  qty: string
  estimate: number
  categoryId?: string
  purposeId?: string
  eventId?: string
  contactId?: string
  shopName: string
  shopPhone: string
  needBy?: string
  priority: Priority
  notes: string
  status: 'pending' | 'bought'
  boughtAt?: string
  actualPrice?: number
  txId?: string
  createdAt: number
}

export interface Reminder {
  id: string
  title: string
  note: string
  at: string
  repeat: Repeat
  eventId?: string
  partyId?: string
  shopItemId?: string
  contactId?: string
  done: boolean
  notified?: string
  createdAt: number
}

export interface Settings {
  name: string
  currency: string
  dialCode: string
  monthlyBudget: number
  theme: ThemeMode
  dailyLogReminder: boolean
  dailyLogTime: string
  budgetAlerts: boolean
  budgetAlerted?: string
  dailyLogNotified?: string
}

export interface AppData {
  categories: Category[]
  transactions: Transaction[]
  events: EventItem[]
  parties: Party[]
  contacts: Contact[]
  shopItems: ShopItem[]
  reminders: Reminder[]
  settings: Settings
}
