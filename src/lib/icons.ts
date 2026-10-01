import {
  Armchair, Baby, Banknote, BookOpen, BrickWall, Briefcase, Building2, Bus, Camera, Car, ChefHat, CircleDollarSign,
  Clapperboard, Coffee, CreditCard, Droplets, Dumbbell, Ellipsis, Flower2, Fuel, Gem, Gift, GraduationCap, HandCoins,
  Hammer, HardHat, HeartHandshake, HeartPulse, House, Landmark, Lightbulb, Music, PartyPopper, PawPrint, PiggyBank,
  Plane, QrCode, Receipt, RotateCcw, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sofa, Sparkles, Stethoscope, Tag,
  TrendingUp, Utensils, Wallet, Wifi, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EventKind, PayMethod } from './types'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, cart: ShoppingCart, car: Car, fuel: Fuel, bag: ShoppingBag, receipt: Receipt, house: House,
  health: HeartPulse, stethoscope: Stethoscope, education: GraduationCap, book: BookOpen, movie: Clapperboard,
  plane: Plane, gift: Gift, sparkles: Sparkles, sofa: Sofa, brick: BrickWall, hardhat: HardHat, hammer: Hammer,
  zap: Zap, droplets: Droplets, armchair: Armchair, flower: Flower2, chef: ChefHat, building: Building2, gem: Gem,
  camera: Camera, shirt: Shirt, wallet: Wallet, briefcase: Briefcase, bank: Landmark, refund: RotateCcw,
  coins: HandCoins, baby: Baby, paw: PawPrint, phone: Smartphone, wifi: Wifi, gym: Dumbbell, coffee: Coffee,
  music: Music, party: PartyPopper, tag: Tag, bus: Bus, bulb: Lightbulb, handshake: HeartHandshake,
  piggy: PiggyBank, trending: TrendingUp, dollar: CircleDollarSign, more: Ellipsis,
}

export const categoryIcon = (key: string): LucideIcon => CATEGORY_ICONS[key] ?? Tag

export const EVENT_KINDS: Record<EventKind, { label: string; icon: LucideIcon; color: string }> = {
  home: { label: 'Home / Construction', icon: House, color: '#f97316' },
  wedding: { label: 'Wedding', icon: Gem, color: '#ec4899' },
  travel: { label: 'Travel / Trip', icon: Plane, color: '#0ea5e9' },
  festival: { label: 'Festival / Party', icon: PartyPopper, color: '#a855f7' },
  business: { label: 'Business', icon: Briefcase, color: '#14b8a6' },
  education: { label: 'Education', icon: GraduationCap, color: '#6366f1' },
  medical: { label: 'Medical', icon: Stethoscope, color: '#ef4444' },
  other: { label: 'Other', icon: Sparkles, color: '#64748b' },
}

export const PAY_METHODS: Record<PayMethod, { label: string; icon: LucideIcon }> = {
  cash: { label: 'Cash', icon: Banknote },
  upi: { label: 'UPI', icon: QrCode },
  card: { label: 'Card', icon: CreditCard },
  bank: { label: 'Bank', icon: Landmark },
  cheque: { label: 'Cheque', icon: Receipt },
  other: { label: 'Other', icon: Wallet },
}
