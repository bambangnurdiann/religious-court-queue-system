// Shared utility types and helpers for the Religious Court queue management system

export const COUNTER_COLORS: Record<string, { primary: string; light: string; medium: string; name: string }> = {
  A: { primary: '#0C2340', light: '#E8EFF7', medium: '#1B3A6B', name: 'Meja A' },
  B: { primary: '#1B3A6B', light: '#EBF0F8', medium: '#2A52A0', name: 'Meja B' },
  C: { primary: '#C8A84B', light: '#FBF4E0', medium: '#A8882B', name: 'Meja C' },
  D: { primary: '#0C2340', light: '#E8EFF7', medium: '#1B3A6B', name: 'Meja D' },
  E: { primary: '#1B3A6B', light: '#EBF0F8', medium: '#2A52A0', name: 'Meja E' },
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
