import type { MouseEvent } from 'react'
import { MapPin, MessageCircle, MessageSquareText, Phone } from 'lucide-react'
import { useStore } from '../store/useStore'
import { mapHref, smsHref, telHref, waHref } from '../lib/phone'
import { cn } from './ui'

const base = 'inline-grid place-items-center rounded-xl transition active:scale-95'

export function PhoneActions({ phone, address, size = 'md', sms = false, className }: { phone?: string; address?: string; size?: 'sm' | 'md'; sms?: boolean; className?: string }) {
  const dial = useStore((s) => s.settings.dialCode)
  if (!phone && !address) return null
  const s = size === 'sm' ? 'size-8' : 'size-10'
  const i = size === 'sm' ? 'size-3.5' : 'size-[18px]'
  const stop = (e: MouseEvent) => e.stopPropagation()
  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)} onClick={stop}>
      {phone && (
        <a href={telHref(phone)} aria-label="Call" title={`Call ${phone}`} className={cn(base, s, 'bg-income/12 text-income hover:bg-income/20')}>
          <Phone className={i} strokeWidth={2.3} />
        </a>
      )}
      {phone && (
        <a href={waHref(phone, dial)} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className={cn(base, s, 'bg-[#25d366]/14 text-[#1da851] hover:bg-[#25d366]/24')}>
          <MessageCircle className={i} strokeWidth={2.3} />
        </a>
      )}
      {phone && sms && (
        <a href={smsHref(phone)} aria-label="SMS" title="SMS" className={cn(base, s, 'bg-sky-500/12 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20')}>
          <MessageSquareText className={i} strokeWidth={2.3} />
        </a>
      )}
      {address && (
        <a href={mapHref(address)} target="_blank" rel="noreferrer" aria-label="Open in maps" title={address} className={cn(base, s, 'bg-due/12 text-due hover:bg-due/20')}>
          <MapPin className={i} strokeWidth={2.3} />
        </a>
      )}
    </div>
  )
}
