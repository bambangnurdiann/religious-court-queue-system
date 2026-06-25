'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

import { COUNTER_COLORS, COUNTER_NAMES, formatCardNumber, formatDateID } from '@/lib/shared'

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

interface CounterState {
  code: string
  name: string
  isOpen: boolean
  nextNumber: number
  todayCount: number
}

interface QueuedCard {
  card_number: string
  queue_number: string
  counter_code: string
}

export default function SatpamPortalPage() {
  const [counters, setCounters] = useState<CounterState[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCounter, setSelectedCounter] = useState<CounterState | null>(null)
  const [queuedCard, setQueuedCard] = useState<QueuedCard | null>(null)
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  const [showSettings, setShowSettings] = useState(false)

  const [settingsCounters, setSettingsCounters] = useState<CounterState[]>([])
  const [todayCards, setTodayCards] = useState<{ code: string; numbers: string[] }[]>([])
  const [errorMsg, setErrorMsg] = useState('')


  const fetchCounters = useCallback(async () => {
    try {
      const data = await apiFetch('/counters')
      const mapped: CounterState[] = (data || []).map((c: Record<string, unknown>) => ({
        code: c.code as string,
        name: COUNTER_NAMES[c.code as keyof typeof COUNTER_NAMES] || (c.name as string) || `Loket ${c.code}`,
        isOpen: (c.is_active as boolean) ?? (c.is_open as boolean) ?? true,
        nextNumber: (c.current_number as number) ? (c.current_number as number) + 1 : 1,
        todayCount: ((c._count as { sessions?: number })?.sessions) ?? (c.queue_count as number) ?? 0,
      }))
      const allCodes = ['A', 'B', 'C', 'D', 'E']
      const full: CounterState[] = allCodes.map(code => {
        const existing = mapped.find(c => c.code === code)
        return existing || { code, name: COUNTER_NAMES[code], isOpen: true, nextNumber: 1, todayCount: 0 }
      })
      setCounters(full)
      setSettingsCounters(full)
    } catch (err) {
      console.error('Failed to fetch counters:', err)
      setCounters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCounters() }, [fetchCounters])

  const handleCounterTap = async (counter: CounterState) => {
    if (!counter.isOpen) return
    setSelectedCounter(counter)
    try {
      const result = await apiFetch('/sessions/activate', {
        method: 'POST',
        body: JSON.stringify({ counter_code: counter.code }),
      })
      setQueuedCard({

        card_number: result.card_number || result.number || formatCardNumber(counter.code, counter.nextNumber),
        queue_number: result.queueNumber || '',
        counter_code: counter.code,
      })
    } catch {
      setErrorMsg('Gagal mengaktifkan antrian. Silakan coba lagi.')
      setQueuedCard({

        card_number: formatCardNumber(counter.code, counter.nextNumber),
        queue_number: '',
        counter_code: counter.code,
      })
    }
    setShowConfirm(true)
  }

  const handleConfirm = () => { setShowConfirm(false); setShowTicket(true); setTimeout(() => { setShowTicket(false); setQueuedCard(null); setSelectedCounter(null); fetchCounters() }, 4000) }

  const handleNewTicket = () => { setQueuedCard(null); setSelectedCounter(null); fetchCounters() }

  const handleToggleCounter = async (code: string) => {
    try {
      const counter = settingsCounters.find(c => c.code === code)
      if (!counter) return
      await apiFetch(`/counters/${code}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_open: !counter.isOpen }) })
    } catch { /* toggle locally anyway */ }
    setSettingsCounters(prev => prev.map(c => c.code === code ? { ...c, isOpen: !c.isOpen } : c))
  }


  const handleResetHarian = async () => {
    if (!confirm('Apakah Anda yakin ingin mereset semua antrian hari ini? Tindakan ini tidak dapat dibatalkan.')) return
    try { await apiFetch('/system/reset', { method: 'POST' }); alert('Reset harian berhasil'); fetchCounters() }
    catch (err) { alert('Gagal mereset: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan')) }
  }

  const fetchTodayCards = async () => {
    try {
      const data = await apiFetch('/sessions/today-cards')
      setTodayCards(data || [])
    } catch (err) {
      console.error('Failed to fetch today cards:', err)
      setTodayCards([])
    }
  }

  const openSettings = () => { setSettingsCounters([...counters]); setTodayCards([]); setShowSettings(true); fetchTodayCards() }

  const color = selectedCounter ? COUNTER_COLORS[selectedCounter.code as keyof typeof COUNTER_COLORS] : COUNTER_COLORS.A

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Memuat data loket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0C2340' }} className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
          <h1 className="text-lg font-bold text-white">Portal Satpam</h1>
          <p className="text-xs text-white/50">{formatDateID(new Date())}</p>
        </div>
        </div>
        <button onClick={openSettings} className="p-2 rounded hover:bg-white/10 transition-colors" aria-label="Pengaturan">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Counter Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto mt-4">
        {counters.map(counter => {
          
          return (
            <button
              key={counter.code}
              onClick={() => handleCounterTap(counter)}
              disabled={!counter.isOpen}
              className={`relative rounded-xl p-4 text-left transition-colors border-2 ${
                counter.isOpen ? 'bg-white border-gray-200 hover:border-[#0C2340] cursor-pointer' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
              }`}
              
            >
              {!counter.isOpen && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10">
                  <span className="text-white font-bold text-lg">LOKET TUTUP</span>
                </div>
              )}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-3" style={{ backgroundColor: counter.isOpen ? '#0C2340' : '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                {counter.code}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{counter.name}</h3>
              <p className="text-xs mt-2" style={{ color: '#C8A84B', fontFamily: "'JetBrains Mono', monospace" }}>
                Selanjutnya: {formatCardNumber(counter.code, counter.nextNumber)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Total hari ini: {counter.todayCount}</p>
            </button>
          )
        })}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && queuedCard && selectedCounter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: color.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                {selectedCounter.code}
              </div>
              <h2 className="text-xl font-bold mt-4 text-gray-900">Konfirmasi Pencetakan</h2>
              <div className="mt-4 py-4 px-6 rounded-xl" style={{ backgroundColor: color.light }}>
                <p className="text-sm text-gray-600">Nomor Antrian</p>
                <p className="text-4xl font-bold mt-1" style={{ color: color.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                  {queuedCard.card_number}
                </p>
              </div>
              <p className="text-sm text-gray-500 mt-3">{selectedCounter.name}</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowConfirm(false); setQueuedCard(null) }} className="flex-1 py-3 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200">
                  Batal
                </button>
                <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95" style={{ backgroundColor: color.primary }}>
                  Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* Fullscreen Ticket */}
      {showTicket && queuedCard && selectedCounter && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: '#0C2340' }}>
          <p className="text-white/60 text-base font-medium mb-2">{selectedCounter.name}</p>
          <h1 className="font-bold text-white leading-none" style={{ fontSize: '7rem', fontFamily: "'JetBrains Mono', monospace", color: '#C8A84B' }}>{queuedCard.card_number}</h1>
          <p className="text-white/40 mt-6 text-sm">Silakan ambil kartu antrian</p>
          <p className="text-white/20 mt-2 text-xs">Menutup otomatis dalam 4 detik...</p>
        </div>
      )}

{errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg ">
          <p>{errorMsg}</p>
          <button onClick={() => setErrorMsg('')} className="absolute top-1 right-2 text-white/80 hover:text-white">&times;</button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Pengaturan</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-700">Status Loket</h3>
              {settingsCounters.map(counter => {
                const c2 = COUNTER_COLORS[counter.code as keyof typeof COUNTER_COLORS]
                return (
                  <div key={counter.code} className="flex items-center justify-between p-3 rounded-xl transition-all duration-200" style={{ backgroundColor: c2.light }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: c2.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                        {counter.code}
                      </div>
                      <span className="font-medium text-sm text-gray-800">{counter.name}</span>
                    </div>
                    <button onClick={() => handleToggleCounter(counter.code)} className={`relative w-14 h-8 rounded-full transition-all duration-200 ${counter.isOpen ? '' : 'bg-gray-300'}`} style={{ backgroundColor: counter.isOpen ? c2.primary : undefined }}>
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${counter.isOpen ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
            {todayCards.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Kartu Hari Ini</h3>
                <div className="space-y-2">
                  {todayCards.map(tc => {
                    const c3 = COUNTER_COLORS[tc.code as keyof typeof COUNTER_COLORS]
                    return (
                      <div key={tc.code} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span className="px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: c3.primary }}>{tc.code}</span>
                        <span className="text-gray-600">{tc.numbers.join(', ')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <button onClick={handleResetHarian} className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold hover:bg-red-100 transition-all duration-200 active:scale-95">
              Reset Harian
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
