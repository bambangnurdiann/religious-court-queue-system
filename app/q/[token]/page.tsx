'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
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

type SessionStatus = 'waiting' | 'called' | 'serving' | 'done' | 'expired'

interface SessionData {
  id: string
  qr_token: string
  card_number: string
  counter_code: string
  counter_name?: string
  status: SessionStatus
  position: number
  total_waiting: number
  estimated_wait_minutes: number
  activated_at: string
  called_at: string | null
  completed_at: string | null
  push_subscription: unknown | null
}

type PageState = 'loading' | 'invalid' | 'active' | 'almost' | 'called' | 'done' | 'expired'

export default function VisitorQueuePage() {
  const params = useParams()
  const token = params?.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [session, setSession] = useState<SessionData | null>(null)
  const [error, setError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)
  const reconnectAttempt = useRef(0)

  // Create socket helper
  function createSocket() {
    // Dynamic import of socket.io-client
    const io = (window as unknown as Record<string, unknown>).__io as ((url: string, opts?: Record<string, unknown>) => {
      on: (event: string, cb: (...args: unknown[]) => void) => void
      off: (event: string) => void
      emit: (event: string, data: unknown) => void
      disconnect: () => void
      connected: boolean
    }) | undefined

    if (!io) {
      // Simple fallback using native WebSocket or polling
      return {
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {},
        connected: false,
      }
    }
    return io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAYS[0],
    })
  }

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch(`/sessions/token/${encodeURIComponent(token)}`)
      setSession(data)
      setPageState(determineState(data))
      return data
    } catch (err) {
      if (err instanceof Error && err.message.includes('tidak valid')) {
        setPageState('invalid')
        setError('Token tidak valid')
      } else {
        setPageState('invalid')
        setError(err instanceof Error ? err.message : 'Token tidak valid')
      }
      return null
    }
  }, [token])

  function determineState(s: SessionData): PageState {
    switch (s.status) {
      case 'waiting': return s.position === 1 ? 'almost' : 'active'
      case 'called':
      case 'serving': return 'called'
      case 'done': return 'done'
      case 'expired': return 'expired'
      default: return 'active'
    }
  }

  useEffect(() => { fetchSession() }, [fetchSession])

  useEffect(() => {
    setPushSupported('Notification' in window && 'serviceWorker' in navigator)
    if ('Notification' in window && Notification.permission === 'granted') setPushEnabled(true)
  }, [])

  useEffect(() => {
    if (!token || pageState === 'loading' || pageState === 'invalid') return
    const connectSocket = () => {
      try {
        const socket = createSocket()
        socketRef.current = socket
        socket.on('connect', () => { reconnectAttempt.current = 0; socket.emit('join', { room: `visitor:${token}` }) })
        socket.on('number_called', (data: unknown) => {
          const d = data as { card_number?: string; counter_code?: string }
          if (d) {
            setSession(prev => prev ? { ...prev, status: 'called', card_number: d.card_number || prev.card_number, counter_code: d.counter_code || prev.counter_code, called_at: new Date().toISOString() } : prev)
            setPageState('called')
          }
        })
        socket.on('queue_position_update', (data: unknown) => {
          const d = data as { position?: number; total_waiting?: number; estimated_wait_minutes?: number }
          if (d) {
            setSession(prev => prev ? { ...prev, position: d.position ?? prev.position, total_waiting: d.total_waiting ?? prev.total_waiting, estimated_wait_minutes: d.estimated_wait_minutes ?? prev.estimated_wait_minutes } : prev)
            if (d.position === 1 && session?.status === 'waiting') setPageState('almost')
          }
        })
        socket.on('session_expired', () => { setPageState('expired'); setSession(prev => prev ? { ...prev, status: 'expired' } : prev) })
        socket.on('session_done', () => { setPageState('done'); setSession(prev => prev ? { ...prev, status: 'done' } : prev) })
        socket.on('disconnect', () => {
          const attempt = reconnectAttempt.current
          if (attempt < RECONNECT_DELAYS.length) {
            setTimeout(() => { reconnectAttempt.current = attempt + 1; connectSocket() }, RECONNECT_DELAYS[attempt])
          }
        })
        if (!socket.connected) socket.emit('join', { room: `visitor:${token}` })
      } catch {
        const pollInterval = setInterval(async () => {
          try { const data = await fetchSession(); if (!data) clearInterval(pollInterval) } catch { /* keep polling */ }
        }, 10000)
        return () => clearInterval(pollInterval)
      }
    }
    connectSocket()
    return () => {
      if (socketRef.current) { socketRef.current.emit('leave', { room: `visitor:${token}` }); socketRef.current.disconnect() }
    }

  // ===== RENDER =====

  const fontSans = { fontFamily: "'Plus Jakarta Sans', sans-serif" }
  const fontMono = { fontFamily: "'JetBrains Mono', monospace" }

  // Loading State
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={fontSans}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 text-lg">Memuat status antrian...</p>
        </div>
      </div>
    )
  }

  // Invalid Token
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6" style={fontSans}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Token Tidak Valid</h1>
          <p className="text-red-600 mb-6">{error || 'Token antrian tidak ditemukan atau sudah kadaluarsa.'}</p>
        </div>
      </div>
    )
  }

  // Active (waiting) or Almost Called
  if (pageState === 'active' || pageState === 'almost') {
    const isAlmost = pageState === 'almost'
    return (
      <div className="min-h-screen bg-gray-50" style={fontSans}>
        {/* Warning Banner for Almost */}
        {isAlmost && (
          <div className="bg-orange-500 text-white px-4 py-3 text-center font-semibold animate-slide-in-down">
            🔔 Segera giliran Anda!
          </div>
        )}

        <div className="max-w-md mx-auto p-6">
          {/* Queue Number Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
            <p className="text-sm text-gray-500 mb-1">Nomor Antrian Anda</p>
            <h1
              className={`text-7xl font-bold mb-2 ${isAlmost ? 'animate-pulse-queue' : ''}`}
              style={{ ...fontMono, color: counterColor.primary }}
            >
              {session?.card_number || formatCardNumber(session?.counter_code || '?', 0)}
            </h1>

            {/* Counter Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ backgroundColor: counterColor.light }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ ...fontMono, backgroundColor: counterColor.primary }}>
                {session?.counter_code}
              </div>
              <span className="text-sm font-medium" style={{ color: counterColor.primary }}>{counterName}</span>
            </div>

            {/* Status Pill */}
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${isAlmost ? 'bg-orange-100 text-orange-700 animate-pulse-queue' : 'bg-blue-100 text-blue-700'}`}>
              {isAlmost ? 'Segera Dipanggil' : 'Menunggu'}
            </span>
          </div>

          {/* Queue Info Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Posisi Anda</span>
              <span className="font-bold text-lg" style={fontMono}>
                {session?.position ?? '?'} <span className="text-sm text-gray-400">dari {session?.total_waiting ?? '?'}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Estimasi Waktu Tunggu</span>
              <span className="font-bold text-lg" style={fontMono}>
                {session?.estimated_wait_minutes != null ? `${session.estimated_wait_minutes} menit` : session?.activated_at ? formatWaitTime(session.activated_at) : '...'}
              </span>
            </div>
          </div>

          {/* Push Notification Opt-in */}
          {pushSupported && !pushEnabled && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">Dapatkan notifikasi</h3>
                  <p className="text-xs text-gray-500 mt-1">Kami akan memberitahu Anda saat giliran tiba</p>
                </div>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={subscribing}
                className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
              >
                {subscribing ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
              </button>
            </div>
          )}

          {pushEnabled && (
            <div className="text-center text-xs text-green-600 mb-4 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Notifikasi aktif
            </div>
          )}
        </div>
      </div>
    )
  }

  // Called / Serving State
  if (pageState === 'called') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...fontSans, backgroundColor: counterColor.light }}>
        <div className="text-center max-w-sm mx-auto p-8">
          {/* Pulsing Green Circle */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: '#059669' }} />
            <div className="relative w-24 h-24 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-green-700 mb-3">Dipanggil!</h1>
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <p className="text-sm text-gray-500 mb-1">Nomor Antrian Anda</p>
            <p className="text-6xl font-bold mb-3 animate-pulse-queue" style={{ ...fontMono, color: counterColor.primary }}>
              {session?.card_number || '—'}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: counterColor.light }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ ...fontMono, backgroundColor: counterColor.primary }}>
                {session?.counter_code}
              </div>
              <span className="text-sm font-medium" style={{ color: counterColor.primary }}>{counterName}</span>
            </div>
          </div>
          <p className="text-green-700 font-semibold text-lg">
            Silakan menuju {counterName}
          </p>
        </div>
      </div>
    )
  }
  // Done State
  if (pageState === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100" style={fontSans}>
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Selesai</h1>
          <p className="text-gray-500">Terima kasih telah menunggu. Semoga hari Anda menyenangkan.</p>
          {session?.card_number && (
            <p className="mt-4 text-lg font-bold text-gray-400" style={fontMono}>{session.card_number}</p>
          )}
        </div>
      </div>
    )
  }

  // Expired State
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50" style={fontSans}>
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Kadaluarsa</h1>
          <p className="text-red-600">Sesi Anda telah berakhir. Silakan mengambil nomor antrian baru.</p>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={fontSans}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}

