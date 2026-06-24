// Shared utility types and helpers for the Religious Court queue management system

export const COUNTER_COLORS: Record<string, { primary: string; light: string; medium: string; name: string }> = {
  A: { primary: '#2563EB', light: '#DBEAFE', medium: '#60A5FA', name: 'Biru' },
  B: { primary: '#059669', light: '#D1FAE5', medium: '#34D399', name: 'Hijau' },
  C: { primary: '#D97706', light: '#FEF3C7', medium: '#FBBF24', name: 'Oranye' },
  D: { primary: '#7C3AED', light: '#EDE9FE', medium: '#A78BFA', name: 'Ungu' },
  E: { primary: '#0D9488', light: '#CCFBF1', medium: '#2DD4BF', name: 'Teal' },
}

export const COUNTER_NAMES: Record<string, string> = {
  A: 'Meja Informasi',
  B: 'Pendaftaran Perkara',
  C: 'Kasir',
  D: 'Pengambilan Produk',
  E: 'Meja E-Court',
}

/**
 * Format a queue card number like "A-015"
 */
export function formatCardNumber(code: string, number: number): string {
  return `${code}-${String(number).padStart(3, '0')}`
}

/**
 * Format wait time from activation timestamp
 * Returns human-readable duration string in Bahasa Indonesia
 */
export function formatWaitTime(activatedAt: string | Date): string {
  const diff = Date.now() - new Date(activatedAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Kurang dari 1 menit'
  if (mins < 60) return `${mins} menit`
  const hours = Math.floor(mins / 60)
  return `${hours} jam ${mins % 60} menit`
}

/**
 * Get the color profile for a counter code
 */
export function getCounterColor(code: string) {
  return COUNTER_COLORS[code] || COUNTER_COLORS.A
}

/**
 * Format a date in Indonesian locale
 */
export function formatDateID(date: Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
