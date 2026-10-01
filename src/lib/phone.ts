export const digits = (p: string) => p.replace(/[^\d+]/g, '')

export const telHref = (p: string) => `tel:${digits(p)}`
export const smsHref = (p: string, body = '') => `sms:${digits(p)}${body ? `?body=${encodeURIComponent(body)}` : ''}`

export const waNumber = (p: string, dialCode: string) => {
  const d = digits(p)
  if (d.startsWith('+')) return d.slice(1)
  const n = d.replace(/^0+/, '')
  return n.length <= 10 ? `${dialCode}${n}` : n
}

export const waHref = (p: string, dialCode: string, text = '') =>
  `https://wa.me/${waNumber(p, dialCode)}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const waShareHref = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

export const mapHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export const initials = (name: string) =>
  name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
