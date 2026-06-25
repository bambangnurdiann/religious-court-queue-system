'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { COUNTER_COLORS, COUNTER_NAMES } from '@/lib/shared'

const API_BASE = '/api'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }))
    throw new Error(err.error || 'Terjadi kesalahan')
  }
  return res.json()
}

interface CounterInfo {
  code: string
  name: string
  isOpen: boolean
  currentNumber: number | null
  waitingCount: number
}

export default function LoketSelectionPage() {
  const router = useRouter()
  const [counters, setCounters] = useState<CounterInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCounters = useCallback(async () => {
    try {
      const data = await apiFetch('/counters')
      const allCodes = ['A', 'B', 'C', 'D', 'E']
      const mapped: CounterInfo[] = allCodes.map(code => {
        const c = (data || []).find((x: Record<string, unknown>) => x.code === code) as Record<string, unknown> | undefined
        return {
          code,
          name: COUNTER_NAMES[code as keyof typeof COUNTER_NAMES],
          isOpen: (c?.is_active as boolean) ?? (c?.is_open as boolean) ?? true,
          currentNumber: (c?.current_number as number) ?? null,
          waitingCount: (c?.waiting_count as number) ?? 0,
        }
      })
      setCounters(mapped)
    } catch (err) {
      console.error('Failed to fetch counters:', err)
      setCounters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCounters() }, [fetchCounters])

  const handleSelect = (counter: CounterInfo) => {
    if (counter.isOpen) {
      router.push(`/loket/${counter.code}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Memuat loket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div style={{ backgroundColor: '#0C2340' }} className="px-4 py-4 flex items-center gap-3 -mx-4 -mt-8 mb-6">
        <Link href="/" className="p-1.5 rounded hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">Dashboard Loket</h1>
          <p className="text-xs text-white/50">Pilih loket untuk mulai</p>
        </div>
      </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {counters.map(counter => {
            const c = COUNTER_COLORS[counter.code as keyof typeof COUNTER_COLORS] || COUNTER_COLORS.A
            return (
              <button
                key={counter.code}
                onClick={() => handleSelect(counter)}
                disabled={!counter.isOpen}
                className={`rounded-xl p-6 text-center transition-colors border-2 ${
                  counter.isOpen ? 'bg-white border-gray-200 hover:border-[#0C2340] cursor-pointer' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                }`}

              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold mb-3"
                  style={{ backgroundColor: counter.isOpen ? '#0C2340' : '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {counter.code}
                </div>
                <h3 className="font-semibold text-gray-900">{counter.name}</h3>
                {counter.currentNumber && (
                  <p className="text-xs mt-1" style={{ color: '#C8A84B', fontFamily: "'JetBrains Mono', monospace" }}>
                    Melayani: {counter.code}-{String(counter.currentNumber).padStart(3, '0')}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {counter.waitingCount} menunggu
                </p>
                {!counter.isOpen && (
                  <span className="inline-block mt-2 text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                    Tutup
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}