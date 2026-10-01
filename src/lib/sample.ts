import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './defaults'
import { toISODate, toLocalDT, uid } from './format'
import type { AppData, Contact, EventItem, Party, PayMethod, Reminder, ShopItem, Transaction } from './types'

const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const pid = (cat: string, name: string) => {
  const p = DEFAULT_CATEGORIES.find((c) => c.id === cat)?.purposes.find((x) => x.name === name)
  return p?.id
}

export const buildSampleData = (): AppData => {
  const r = rng(42)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const now = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return toISODate(d)
  }
  const at = (days: number, hh: number, mm = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    d.setHours(hh, mm, 0, 0)
    return toLocalDT(d)
  }
  const tx: Transaction[] = []
  const add = (t: Omit<Transaction, 'id' | 'createdAt'>) => tx.push({ ...t, id: uid(), createdAt: Date.now() - tx.length })

  const daily: [string, [string, string][], number, number][] = [
    ['food', [['Lunch', 'Lunch'], ['Dinner out', 'Restaurant'], ['Tea & snacks', 'Tea & Snacks'], ['Swiggy order', 'Online order'], ['Breakfast', 'Breakfast']], 80, 900],
    ['groceries', [['Vegetables', 'Vegetables'], ['Monthly ration', 'Monthly ration'], ['Milk & bread', 'Milk & Dairy'], ['Fruits', 'Fruits'], ['Fish', 'Fish & Meat']], 120, 2600],
    ['transport', [['Auto', 'Auto / Taxi'], ['Metro card', 'Bus / Train / Metro'], ['Uber ride', 'Auto / Taxi'], ['Petrol', 'Fuel']], 30, 1200],
    ['shopping', [['T-shirt', 'Clothes'], ['Shoes', 'Shoes'], ['Amazon order', 'Online shopping']], 400, 3500],
    ['entertainment', [['Movie tickets', 'Movies'], ['Netflix', 'Subscriptions'], ['Weekend outing', 'Outing']], 199, 1200],
    ['personal', [['Haircut', 'Salon'], ['Toiletries', 'Cosmetics']], 150, 700],
  ]
  for (let d = 0; d < 150; d++) {
    const n = Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const [cat, notes, min, max] = pick(daily)
      const [note, purpose] = pick(notes)
      add({ type: 'expense', amount: Math.round(min + r() * (max - min)), date: daysAgo(d), categoryId: cat, purposeId: pid(cat, purpose), note, method: pick<PayMethod>(['upi', 'upi', 'cash', 'card']) })
    }
  }
  for (let m = 0; m < 5; m++) {
    const first = toISODate(new Date(now.getFullYear(), now.getMonth() - m, 1))
    const fifth = toISODate(new Date(now.getFullYear(), now.getMonth() - m, Math.min(5, now.getDate())))
    add({ type: 'income', amount: 85000, date: first, categoryId: 'salary', purposeId: pid('salary', 'Monthly salary'), note: 'Monthly salary', method: 'bank' })
    add({ type: 'expense', amount: 15000, date: fifth, categoryId: 'home', purposeId: pid('home', 'Rent'), note: 'House rent', method: 'bank' })
    add({ type: 'expense', amount: Math.round(1800 + r() * 900), date: fifth, categoryId: 'bills', purposeId: pid('bills', 'Electricity'), note: 'Electricity bill', method: 'upi' })
    add({ type: 'expense', amount: 799, date: fifth, categoryId: 'bills', purposeId: pid('bills', 'Internet / Wi-Fi'), note: 'Wi-Fi recharge', method: 'upi' })
  }

  const home: EventItem = { id: uid(), name: 'New House Construction', kind: 'home', budget: 2500000, startDate: daysAgo(140), notes: '2-storey house at Salt Lake plot', status: 'active', color: '#f97316', createdAt: Date.now() }
  const wedding: EventItem = { id: uid(), name: "Riya's Wedding", kind: 'wedding', budget: 800000, startDate: daysAgo(30), endDate: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 24)), notes: 'Sister wedding — 300 guests', status: 'active', color: '#ec4899', createdAt: Date.now() }
  const trip: EventItem = { id: uid(), name: 'Darjeeling Trip', kind: 'travel', budget: 45000, startDate: daysAgo(100), endDate: daysAgo(95), notes: '', status: 'completed', color: '#0ea5e9', createdAt: Date.now() }

  const party = (eventId: string, name: string, role: string, agreedAmount: number, categoryId: string, purpose: string, phone = '', direction: Party['direction'] = 'pay'): Party =>
    ({ id: uid(), eventId, name, role, phone, direction, agreedAmount, categoryId, purposeId: pid(categoryId, purpose), notes: '', createdAt: Date.now() })

  const parties: Party[] = [
    party(home.id, 'Ramesh Builders', 'Main contractor', 1200000, 'construction', 'Contractor', '98300 12345'),
    party(home.id, 'Shyam Mistri', 'Mason (labour)', 260000, 'construction', 'Mason & Labour', '98745 66123'),
    party(home.id, 'Maa Tara Hardware', 'Cement, rod & bricks', 420000, 'construction', 'Cement', '90070 33221'),
    party(home.id, 'Bablu Electricals', 'Electrician', 85000, 'construction', 'Electrical work', '97480 11002'),
    party(home.id, 'Aqua Plumbing', 'Plumber', 65000, 'construction', 'Plumbing', '98310 45500'),
    party(home.id, 'Uncle Prakash', 'Loan for house', 300000, 'loan', 'From family', '98300 99887', 'receive'),
    party(wedding.id, 'Royal Banquet Hall', 'Venue', 180000, 'wedding', 'Venue', '98311 90909'),
    party(wedding.id, 'Annapurna Caterers', 'Catering (300 plates)', 240000, 'wedding', 'Catering', '98300 45678'),
    party(wedding.id, 'Phoolwala Decor', 'Decoration & flowers', 90000, 'wedding', 'Decoration', '90513 22110'),
    party(wedding.id, 'Click Studio', 'Photo + video', 75000, 'wedding', 'Photography & Video', '98742 00321'),
    party(wedding.id, 'Senco Gold', 'Jewellery', 210000, 'wedding', 'Jewellery', '1800 103 0017'),
  ]

  const pay = (p: Party, amount: number, ago: number, note: string, method: PayMethod = 'bank') =>
    add({ type: p.direction === 'pay' ? 'expense' : 'income', amount, date: daysAgo(ago), categoryId: p.categoryId ?? 'other', purposeId: p.purposeId, note, method, eventId: p.eventId, partyId: p.id })

  const [contractor, mason, hardware, electric, plumber, loan, venue, caterer, decor, photo, gold] = parties
  pay(contractor, 300000, 135, 'Advance — foundation')
  pay(contractor, 250000, 90, 'Ground floor slab')
  pay(contractor, 200000, 35, 'First floor slab')
  for (let w = 0; w < 18; w++) pay(mason, 9500, 138 - w * 7, `Week ${w + 1} wages`, 'cash')
  pay(hardware, 120000, 130, '400 bags cement')
  pay(hardware, 95000, 98, 'TMT rods')
  pay(hardware, 60000, 50, 'Bricks 12,000 pcs')
  pay(electric, 25000, 30, 'Wiring advance', 'upi')
  pay(plumber, 15000, 28, 'Pipe fitting advance', 'upi')
  pay(loan, 150000, 120, 'First instalment received')
  add({ type: 'expense', amount: 18000, date: daysAgo(132), categoryId: 'construction', purposeId: pid('construction', 'Plan approval'), note: 'Municipality plan approval', method: 'bank', eventId: home.id })
  add({ type: 'expense', amount: 6500, date: daysAgo(80), categoryId: 'construction', purposeId: pid('construction', 'Material transport'), note: 'Sand transport (2 trucks)', method: 'cash', eventId: home.id })
  add({ type: 'expense', amount: 38000, date: daysAgo(12), categoryId: 'construction', purposeId: pid('construction', 'Tiles & Flooring'), note: 'Bathroom tiles', method: 'upi', eventId: home.id })

  pay(venue, 50000, 28, 'Booking advance')
  pay(caterer, 80000, 20, 'Advance')
  pay(decor, 20000, 15, 'Advance', 'upi')
  pay(photo, 25000, 18, 'Advance', 'upi')
  pay(gold, 150000, 22, 'Necklace set', 'card')
  add({ type: 'expense', amount: 42000, date: daysAgo(14), categoryId: 'wedding', purposeId: pid('wedding', 'Bride clothing'), note: 'Bridal lehenga', method: 'card', eventId: wedding.id })
  add({ type: 'expense', amount: 9500, date: daysAgo(10), categoryId: 'wedding', purposeId: pid('wedding', 'Invitation cards'), note: '350 cards printed', method: 'upi', eventId: wedding.id })
  add({ type: 'expense', amount: 18500, date: daysAgo(6), categoryId: 'wedding', purposeId: pid('wedding', 'Groom clothing'), note: 'Sherwani for groom family gift', method: 'card', eventId: wedding.id })
  add({ type: 'income', amount: 51000, date: daysAgo(5), categoryId: 'gift-received', purposeId: pid('gift-received', 'Shagun'), note: 'Ashirbad from Mama', method: 'cash', eventId: wedding.id })

  add({ type: 'expense', amount: 14200, date: daysAgo(100), categoryId: 'travel', purposeId: pid('travel', 'Tickets'), note: 'Train tickets', method: 'upi', eventId: trip.id })
  add({ type: 'expense', amount: 16800, date: daysAgo(99), categoryId: 'travel', purposeId: pid('travel', 'Hotel'), note: 'Hotel 4 nights', method: 'card', eventId: trip.id })
  add({ type: 'expense', amount: 7400, date: daysAgo(97), categoryId: 'travel', purposeId: pid('travel', 'Food'), note: 'Food & cafes', method: 'upi', eventId: trip.id })

  const contact = (name: string, kind: Contact['kind'], phone: string, address = '', notes = ''): Contact => ({ id: uid(), name, kind, phone, altPhone: '', address, notes, createdAt: Date.now() })
  const contacts: Contact[] = [
    contact('Gariahat Saree Emporium', 'shop', '98301 77665', 'Gariahat Road, Kolkata', 'Ask for Mr. Dutta — gives wedding discount'),
    contact('Bhim Chandra Nag Sweets', 'shop', '033 2241 1234', 'Bowbazar, Kolkata'),
    contact('Sharma Electronics', 'shop', '90070 12121', 'Lake Town Market'),
    contact('Pandit Ji (Mukherjee)', 'service', '98745 30303', '', 'For wedding rituals'),
    contact('Rahul (cousin)', 'person', '97480 55443'),
    contact('Laxmi Tent House', 'service', '98310 66778', 'Behala Chowrasta'),
  ]
  const [saree, sweets, electronics, pandit, , tent] = contacts

  const item = (name: string, qty: string, estimate: number, categoryId: string, purpose: string, opts: Partial<ShopItem> = {}): ShopItem => ({
    id: uid(), name, qty, estimate, categoryId, purposeId: pid(categoryId, purpose), shopName: '', shopPhone: '', priority: 'medium', notes: '', status: 'pending', createdAt: Date.now(), ...opts,
  })
  const plusDays = (n: number) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n))
  const shopItems: ShopItem[] = [
    item('Benarasi saree for bride', '1', 35000, 'wedding', 'Bride clothing', { eventId: wedding.id, contactId: saree.id, needBy: plusDays(5), priority: 'high' }),
    item('Tattva sarees for in-laws', '6', 18000, 'wedding', 'Gifts & Return gifts', { eventId: wedding.id, contactId: saree.id, needBy: plusDays(7) }),
    item('Rasgulla & sandesh', '20 kg', 12000, 'wedding', 'Catering', { eventId: wedding.id, contactId: sweets.id, needBy: plusDays(22), notes: 'Order 3 days before' }),
    item('Puja samagri', '1 set', 4500, 'wedding', 'Priest & Rituals', { eventId: wedding.id, contactId: pandit.id, needBy: plusDays(20) }),
    item('Chairs & shamiana', '150 chairs', 15000, 'wedding', 'Decoration', { eventId: wedding.id, contactId: tent.id, needBy: plusDays(23), priority: 'high' }),
    item('Return gift boxes', '300 pcs', 9000, 'wedding', 'Gifts & Return gifts', { eventId: wedding.id, shopName: 'Burrabazar wholesale', shopPhone: '', needBy: plusDays(15), priority: 'low' }),
    item('Bathroom fittings (Jaquar)', '2 sets', 26000, 'construction', 'Sanitary fittings', { eventId: home.id, shopName: 'Maa Tara Hardware', shopPhone: '90070 33221', needBy: plusDays(10) }),
    item('Asian Paints — exterior', '40 L', 22000, 'construction', 'Paint', { eventId: home.id, needBy: plusDays(30), priority: 'low' }),
    item('Ceiling fans', '5', 12500, 'home', 'Appliances', { eventId: home.id, contactId: electronics.id, needBy: plusDays(-2), priority: 'high' }),
    item('Rice 25 kg + dal', '1 bag', 2200, 'groceries', 'Monthly ration', { needBy: plusDays(1) }),
    item('Pressure cooker 5L', '1', 1800, 'home', 'Kitchen items', { status: 'bought', boughtAt: daysAgo(3), actualPrice: 1650 }),
  ]

  const rem = (title: string, when: string, opts: Partial<Reminder> = {}): Reminder => ({ id: uid(), title, note: '', at: when, repeat: 'none', done: false, createdAt: Date.now(), ...opts })
  const reminders: Reminder[] = [
    rem('Pay caterer 2nd instalment', at(2, 11), { eventId: wedding.id, partyId: caterer.id, note: '₹80,000 as agreed' }),
    rem('Buy bride saree at Gariahat', at(1, 17, 30), { eventId: wedding.id, shopItemId: shopItems[0].id, contactId: saree.id }),
    rem('Confirm menu tasting', at(4, 18), { eventId: wedding.id, partyId: caterer.id }),
    rem('Call Pandit Ji for muhurat', at(0, 19), { eventId: wedding.id, contactId: pandit.id }),
    rem('Mason weekly wages', at(3, 10), { eventId: home.id, partyId: mason.id, repeat: 'weekly', note: '₹9,500' }),
    rem('Electricity bill', at(5, 10), { repeat: 'monthly' }),
    rem('Order ceiling fans', at(-1, 12), { eventId: home.id, shopItemId: shopItems[8].id, contactId: electronics.id }),
  ]

  return {
    categories: DEFAULT_CATEGORIES,
    transactions: tx,
    events: [home, wedding, trip],
    parties,
    contacts,
    shopItems,
    reminders,
    settings: { ...DEFAULT_SETTINGS, monthlyBudget: 45000 },
  }
}
