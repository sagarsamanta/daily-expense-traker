import type { Category, EventKind, Settings } from './types'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const c = (id: string, name: string, icon: string, color: string, purposes: string[] = [], type: Category['type'] = 'expense'): Category => ({
  id,
  name,
  icon,
  color,
  type,
  purposes: purposes.map((p) => ({ id: `${id}:${slug(p)}`, name: p })),
})

export const DEFAULT_CATEGORIES: Category[] = [
  c('food', 'Food & Dining', 'utensils', '#f97316', ['Breakfast', 'Lunch', 'Dinner', 'Tea & Snacks', 'Online order', 'Restaurant']),
  c('groceries', 'Groceries', 'cart', '#22c55e', ['Vegetables', 'Fruits', 'Milk & Dairy', 'Monthly ration', 'Fish & Meat', 'Household supplies']),
  c('transport', 'Transport', 'bus', '#0ea5e9', ['Fuel', 'Auto / Taxi', 'Bus / Train / Metro', 'Parking & Toll', 'Vehicle service']),
  c('home', 'Home', 'house', '#8b5cf6', ['Rent', 'Maintenance', 'Repairs', 'Cleaning & Maid', 'Furniture', 'Appliances', 'Kitchen items', 'Decor', 'Bedding & Curtains']),
  c('construction', 'Home Construction', 'hardhat', '#ea580c', ['Land & Registration', 'Plan approval', 'Cement', 'Bricks', 'Sand & Stone', 'Steel / Rod', 'Contractor', 'Mason & Labour', 'Electrical work', 'Plumbing', 'Tiles & Flooring', 'Paint', 'Doors & Windows', 'Wood work', 'Sanitary fittings', 'Material transport']),
  c('wedding', 'Wedding', 'gem', '#ec4899', ['Venue', 'Catering', 'Decoration', 'Bride clothing', 'Groom clothing', 'Jewellery', 'Makeup & Mehendi', 'Photography & Video', 'Invitation cards', 'Gifts & Return gifts', 'Music / DJ / Band', 'Priest & Rituals', 'Guest travel & Stay', 'Shagun / Tattva']),
  c('festival', 'Festival & Puja', 'party', '#a855f7', ['Puja items', 'Sweets', 'New clothes', 'Gifts', 'Decoration & Lights', 'Pandal / Donation']),
  c('bills', 'Bills & Utilities', 'bulb', '#6366f1', ['Electricity', 'Water', 'Gas cylinder', 'Mobile recharge', 'Internet / Wi-Fi', 'DTH / OTT']),
  c('shopping', 'Shopping', 'bag', '#db2777', ['Clothes', 'Shoes', 'Electronics', 'Accessories', 'Online shopping']),
  c('health', 'Health & Medical', 'health', '#ef4444', ['Doctor', 'Medicines', 'Tests & Scans', 'Hospital', 'Insurance']),
  c('education', 'Education', 'education', '#3b82f6', ['School / College fees', 'Books & Stationery', 'Tuition', 'Courses']),
  c('family', 'Family & Kids', 'baby', '#f59e0b', ['Kids', 'Parents', 'Pets', 'Pocket money']),
  c('entertainment', 'Entertainment', 'movie', '#9333ea', ['Movies', 'Outing', 'Subscriptions', 'Games']),
  c('travel', 'Travel', 'plane', '#0284c7', ['Tickets', 'Hotel', 'Food', 'Local travel', 'Sightseeing']),
  c('gifts', 'Gifts & Donations', 'gift', '#f43f5e', ['Birthday', 'Wedding gift', 'Donation', 'Festival gift']),
  c('personal', 'Personal Care', 'sparkles', '#d946ef', ['Salon', 'Cosmetics', 'Gym & Fitness']),
  c('emi', 'EMI & Loans', 'bank', '#475569', ['Home loan', 'Car / Bike loan', 'Credit card bill', 'Personal loan']),
  c('other', 'Other', 'more', '#64748b'),
  c('salary', 'Salary', 'briefcase', '#10b981', ['Monthly salary', 'Bonus'], 'income'),
  c('business-income', 'Business', 'trending', '#059669', ['Sales', 'Services'], 'income'),
  c('gift-received', 'Gift Received', 'gift', '#e11d48', ['Shagun', 'Birthday', 'Festival'], 'income'),
  c('loan', 'Loan / Borrowed', 'coins', '#2563eb', ['From family', 'From friend', 'Bank loan'], 'income'),
  c('refund', 'Refund', 'refund', '#0d9488', [], 'income'),
  c('other-income', 'Other Income', 'dollar', '#16a34a', [], 'income'),
]

export const LEGACY_CATEGORY_IDS = ['fuel', 'rent', 'mobile', 'household', 'material', 'labour', 'contractor', 'electrical', 'plumbing', 'furniture', 'venue', 'catering', 'decor', 'jewellery', 'photo']

export const EVENT_SUGGESTED_CATEGORIES: Record<EventKind, string[]> = {
  home: ['construction', 'home', 'transport', 'other'],
  wedding: ['wedding', 'shopping', 'gifts', 'travel', 'food', 'other'],
  travel: ['travel', 'transport', 'food', 'shopping', 'entertainment', 'other'],
  festival: ['festival', 'food', 'gifts', 'shopping', 'other'],
  business: ['transport', 'bills', 'other'],
  education: ['education', 'transport', 'shopping', 'other'],
  medical: ['health', 'transport', 'food', 'other'],
  other: ['other'],
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  currency: 'INR',
  dialCode: '91',
  monthlyBudget: 0,
  theme: 'system',
  dailyLogReminder: false,
  dailyLogTime: '21:00',
  budgetAlerts: true,
}

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee', dial: '91' },
  { code: 'BDT', label: 'Bangladeshi Taka', dial: '880' },
  { code: 'USD', label: 'US Dollar', dial: '1' },
  { code: 'EUR', label: 'Euro', dial: '49' },
  { code: 'GBP', label: 'British Pound', dial: '44' },
  { code: 'AED', label: 'UAE Dirham', dial: '971' },
  { code: 'SAR', label: 'Saudi Riyal', dial: '966' },
  { code: 'NPR', label: 'Nepalese Rupee', dial: '977' },
  { code: 'PKR', label: 'Pakistani Rupee', dial: '92' },
  { code: 'LKR', label: 'Sri Lankan Rupee', dial: '94' },
  { code: 'SGD', label: 'Singapore Dollar', dial: '65' },
  { code: 'CAD', label: 'Canadian Dollar', dial: '1' },
  { code: 'AUD', label: 'Australian Dollar', dial: '61' },
]

export const SWATCHES = ['#5b5ef4', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b']
