'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io as socketIO } from 'socket.io-client'
import { COUNTER_COLORS, COUNTER_NAMES, formatCardNumber } from '@/lib/shared'

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

interface CounterDisplay {
  code: string
  name: string
  currentNumber: number | null
  currentCardNumber: string | null
  lastServed: string[]
  isOpen: boolean
}

export default function PublicDisplayPage() {
  const [counters, setCounters] = useState<CounterDisplay[]>([])
  const [currentTime, setCurrentTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [flashCounter, setFlashCounter] = useState<string | null>(null)
  const prevNumbersRef = useRef<Record<string, number | null>>({})
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)
  const reconnectAttempt = useRef(0)

  function createSocket() {
    return socketIO('/', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 6,
    })
  }

  const mapCounters = (data: unknown[]): CounterDisplay[] => {
    const allCodes = ['A', 'B', 'C', 'D', 'E']
    return allCodes.map(code => {
      const c = (data || []).find((x: unknown) => {
        const d = x as Record<string, unknown>
        return d.code === code
      }) as Record<string, unknown> | undefined
      const cn = (c?.current_number as number) ?? null
      const lastServedArr = (c?.last_served as string[]) || []
      return {
        code,
        name: COUNTER_NAMES[code as keyof typeof COUNTER_NAMES],
        currentNumber: cn,
        currentCardNumber: cn ? formatCardNumber(code, cn) : null,
        lastServed: lastServedArr.slice(0, 3),
        isOpen: (c?.is_active as boolean) ?? (c?.is_open as boolean) ?? true,
      }
    })
  }

  const fetchCounters = useCallback(async () => {
    try {
      const data = await apiFetch('/counters')
      const mapped = mapCounters(data)
      setCounters(mapped)
      // Update prev numbers
      mapped.forEach(c => {
        if (c.currentNumber !== null && prevNumbersRef.current[c.code] !== c.currentNumber) {
          prevNumbersRef.current[c.code] = c.currentNumber
        }
      })
    } catch {
      // Use empty fallback
      setCounters(mapCounters([]))
    } finally {
      setLoading(false)
    }
  }, [])

  // Clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { fetchCounters() }, [fetchCounters])

  useEffect(() => {
    const pollInterval = setInterval(fetchCounters, 30000)
    return () => clearInterval(pollInterval)
  }, [fetchCounters])

  useEffect(() => {
    const connectSocket = () => {
      try {
        const socket = createSocket()
        socketRef.current = socket
        socket.on('connect', () => {
          reconnectAttempt.current = 0
          ;['A', 'B', 'C', 'D', 'E'].forEach(code => socket.emit('join:counter', code))
        })
        socket.on('number_called', (data: unknown) => {
          const d = data as { code?: string; counter_code?: string; number?: number; card_number?: string }
          const code = d.code || d.counter_code
          const number = d.number
          if (code && number != null) {
            const cardNumber = d.card_number || formatCardNumber(code, number)
            setFlashCounter(code)
            setTimeout(() => setFlashCounter(null), 500)
            setCounters(prev => prev.map(c =>
              c.code === code ? { ...c, currentNumber: number, currentCardNumber: cardNumber, lastServed: [cardNumber, ...c.lastServed].slice(0, 3) } : c
            ))
            try {
              const counterName = COUNTER_NAMES[code as keyof typeof COUNTER_NAMES] || `Loket ${code}`
              const utterance = new SpeechSynthesisUtterance(`Nomor ${cardNumber.replace('-', ' ')} , silakan menuju ${counterName}`)
              utterance.lang = 'id-ID'; utterance.rate = 0.85
              speechSynthesis.cancel(); speechSynthesis.speak(utterance)
            } catch { /* silence */ }
          }
        })
        socket.on('disconnect', () => {
          const attempt = reconnectAttempt.current
          if (attempt < RECONNECT_DELAYS.length) {
            setTimeout(() => { reconnectAttempt.current = attempt + 1; connectSocket() }, RECONNECT_DELAYS[attempt])
          }
        })
      } catch { /* silence */ }
    }
    connectSocket()
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [])

  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Clock */}
      <div className="absolute top-4 right-6 z-10">
        <div className="text-3xl font-bold tracking-wider text-white/90" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {currentTime}
        </div>
      </div>

      {/* Title */}
      <div className="text-center pt-4 pb-1">
        <h1 className="text-lg font-semibold text-white/70 tracking-wide">Sistem Antrian Digital</h1>
      </div>

      {/* Counter Grid - 5 columns */}
      <div className="flex-1 grid grid-cols-5 gap-2 px-3 pb-16 pt-2">
        {counters.map(counter => {
          const c = COUNTER_COLORS[counter.code as keyof typeof COUNTER_COLORS] || COUNTER_COLORS.A
          const isFlashing = flashCounter === counter.code
          return (
            <div
              key={counter.code}
              className="flex flex-col rounded-xl overflow-hidden"
              style={{ backgroundColor: '#1F2937' }}
            >
              {/* Counter Header */}
              <div className="px-3 py-3 text-center" style={{ backgroundColor: c.primary }}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-90">{counter.name}</div>
                <div className="text-lg font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  LOKET {counter.code}
                </div>
              </div>

              {/* Current Number */}
              <div className="flex-1 flex flex-col items-center justify-center py-6">
                {counter.currentCardNumber ? (
                  <div
                    className={`text-center transition-all duration-200 ${isFlashing ? 'animate-color-flash scale-110' : ''}`}
                  >
                    <p className="text-6xl lg:text-7xl xl:text-8xl font-bold leading-none" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.medium }}>
                      {counter.currentCardNumber}
                    </p>
                    <p className="text-xs text-gray-400 mt-3 font-medium">Sedang dilayani</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-5xl text-gray-600 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>—</p>
                    <p className="text-xs text-gray-500 mt-3">Sedang dilayani</p>
                  </div>
                )}
              </div>

              {/* Last 3 Served */}
              <div className="px-3 pb-4">
                <div className="border-t border-gray-700 pt-3 space-y-1">
                  {counter.lastServed.length > 0 ? (
                    counter.lastServed.map((num, i) => (
                      <div key={i} className="text-xs text-gray-400 flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                          {i + 1}
                        </span>
                        {num}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-600 italic">Belum ada</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Marquee Ticker */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-2 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-sm text-white/60 font-medium">
          Pengadilan Agama — Sistem Antrian Digital&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
          Pengadilan Agama — Sistem Antrian Digital&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
          Pengadilan Agama — Sistem Antrian Digital
        </div>
      </div>
    </div>
  )
}

