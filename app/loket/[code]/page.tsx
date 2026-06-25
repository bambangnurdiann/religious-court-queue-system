'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { COUNTER_COLORS, COUNTER_NAMES, formatCardNumber, formatWaitTime } from '@/lib/shared'

const API_BASE = '/api'
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]

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

interface WaitingEntry {
  id: string
  card_number: string
  position: number
  activated_at: string
  estimated_wait_minutes: number
}

export default function CounterDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params?.code as string)?.toUpperCase() || 'A'

  const [activeTab, setActiveTab] = useState<'antrian' | 'laporan'>('antrian')
  const [currentNumber, setCurrentNumber] = useState<number | null>(null)
  const [currentCardNumber, setCurrentCardNumber] = useState<string | null>(null)
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)
  const reconnectAttempt = useRef(0)

  const color = COUNTER_COLORS[code as keyof typeof COUNTER_COLORS] || COUNTER_COLORS.A
  const counterName = COUNTER_NAMES[code as keyof typeof COUNTER_NAMES] || `Loket ${code}`

  function createSocket() {
    const io = (window as unknown as Record<string, unknown>).__io as ((url: string, opts?: Record<string, unknown>) => {
      on: (event: string, cb: (...args: unknown[]) => void) => void
      off: (event: string) => void
      emit: (event: string, data: unknown) => void
      disconnect: () => void
      connected: boolean
    }) | undefined
    if (!io) {
      return { on: () => {}, off: () => {}, emit: () => {}, disconnect: () => {}, connected: false }
    }
    return io(API_BASE, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: RECONNECT_DELAYS[0] })
  }

  const fetchData = useCallback(async () => {
    try {
      const [counterData, nextCardData] = await Promise.all([
        apiFetch('/counters'),
        apiFetch(`/counters/${code}/next-card`).catch(() => null),
      ])
      const c = (counterData || []).find((x: Record<string, unknown>) => x.code === code) as Record<string, unknown> | undefined
      setCurrentNumber((c?.current_number as number) ?? null)
      if (c?.current_number != null) setCurrentCardNumber(formatCardNumber(code, c.current_number as number))
      if (nextCardData?.waiting_list) {
        setWaitingList((nextCardData.waiting_list as Array<Record<string, unknown>>).map((w: Record<string, unknown>, i: number) => ({
          id: w.id as string,
          card_number: (w.card_number as string) || formatCardNumber(code, (w.number as number) || i + 1),
          position: (w.position as number) || i + 1,
          activated_at: (w.activated_at as string) || new Date().toISOString(),
          estimated_wait_minutes: (w.estimated_wait_minutes as number) || 0,
        })))
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [code])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const connectSocket = () => {
      try {
        const socket = createSocket()
        socketRef.current = socket
        socket.on('connect', () => { reconnectAttempt.current = 0; socket.emit('join', { room: `counter:${code}` }) })
        socket.on('queue_update', () => { fetchData() })
        socket.on('disconnect', () => {
          const attempt = reconnectAttempt.current
          if (attempt < RECONNECT_DELAYS.length) { setTimeout(() => { reconnectAttempt.current = attempt + 1; connectSocket() }, RECONNECT_DELAYS[attempt]) }
        })
      } catch { /* fallback */ }
    }
    connectSocket()
    return () => { if (socketRef.current) socketRef.current.disconnect() }
  }, [code, fetchData])

  const handleCallNext = async () => {
    setCalling(true)
    try { await apiFetch('/sessions/call-next', { method: 'POST', body: JSON.stringify({ counter_code: code }) }); await fetchData() }
    catch (err) { alert('Gagal memanggil: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan')) }
    finally { setCalling(false) }
  }

  const handleRecall = async () => {
    setCalling(true)
    try { await apiFetch('/sessions/recall', { method: 'POST', body: JSON.stringify({ counter_code: code }) }) }
    catch (err) { alert('Gagal memanggil ulang: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan')) }
    finally { setCalling(false) }
  }

  const handleDone = async (sessionId: string) => {
    setActionLoading(sessionId)
    try { await apiFetch('/sessions/done', { method: 'POST', body: JSON.stringify({ counter_code: code, session_id: sessionId }) }); await fetchData() }
    catch (err) { alert('Gagal: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan')) }
    finally { setActionLoading(null) }
  }

  const handleSkip = async (sessionId: string) => {
    setActionLoading(sessionId)
    try { await apiFetch('/sessions/skip', { method: 'POST', body: JSON.stringify({ counter_code: code, session_id: sessionId }) }); await fetchData() }
    catch (err) { alert('Gagal: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan')) }
    finally { setActionLoading(null) }
  }

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
      <div className="text-white px-4 py-4" style={{ backgroundColor: color.primary }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/loket')} className="p-1.5 rounded-full hover:bg-white/20 transition-all duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">{counterName}</h1>
            <p className="text-sm opacity-80">Loket {code}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 bg-white/10 rounded-lg p-1">
          <button onClick={() => setActiveTab('antrian')} className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'antrian' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'}`}>
            Antrian
          </button>
          <button onClick={() => router.push(`/loket/${code}/laporan`)} className="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 text-white/80 hover:text-white">
            Laporan
          </button>
        </div>

        {activeTab === 'antrian' && (
            <div className="mt-5 flex gap-3">
              <button onClick={handleCallNext} disabled={calling} className="flex-1 py-4 rounded-xl font-bold text-lg text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: color.primary }}>
                {calling ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                )}
                PANGGIL BERIKUTNYA
              </button>
              {currentCardNumber && (
                <button onClick={handleRecall} disabled={calling} className="px-5 py-4 rounded-xl font-semibold border-2 transition-all duration-200 hover:bg-gray-50 active:scale-95 disabled:opacity-50" style={{ borderColor: color.primary, color: color.primary }}>
                  Panggil Ulang
                </button>
              )}
            </div>
        )}
      </div>

      {/* Waiting List */}
      {activeTab === 'antrian' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Daftar Tunggu</h3>
            {waitingList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Belum ada antrian</p>
            ) : (
              <div className="space-y-3">
                {waitingList.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all duration-200">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: color.light, color: color.primary, fontFamily: "'JetBrains Mono', monospace" }}>{entry.position}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{entry.card_number}</p>
                      <p className="text-xs text-gray-500">Tunggu: {entry.estimated_wait_minutes > 0 ? `${entry.estimated_wait_minutes} menit` : formatWaitTime(entry.activated_at)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={handleRecall} title="Panggil Ulang" className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6M3 10l6 6" /></svg>
                      </button>
                      <button onClick={() => handleDone(entry.id)} disabled={actionLoading === entry.id} title="Tandai Selesai" className="p-2 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200 disabled:opacity-50">
                        {actionLoading === entry.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" /> : <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <button onClick={() => handleSkip(entry.id)} disabled={actionLoading === entry.id} title="Lewati" className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 disabled:opacity-50">
                        {actionLoading === entry.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600" /> : <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      )}
    </div>
  )
}