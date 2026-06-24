'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
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

interface SessionRow {
  id: string
  card_number: string
  status: string
  activated_at: string
  called_at: string | null
  completed_at: string | null
}

interface HourlyData {
  hour: string
  served: number
}

interface ReportData {
  total_served: number
  total_skipped: number
  avg_wait_minutes: number
  hourly_data: HourlyData[]
  sessions: SessionRow[]
}

export default function LaporanPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params?.code as string)?.toUpperCase() || 'A'

  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const color = COUNTER_COLORS[code as keyof typeof COUNTER_COLORS] || COUNTER_COLORS.A
  const counterName = COUNTER_NAMES[code as keyof typeof COUNTER_NAMES] || `Loket ${code}`

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/stats/counter/${code}?date=${date}`)
      setReport({
        total_served: data.total_served || data.total_dilayani || 0,
        total_skipped: data.total_skipped || data.total_dilewati || 0,
        avg_wait_minutes: data.avg_wait_minutes || data.rata_rata_waktu_tunggu || 0,
        hourly_data: (data.hourly_data || data.per_jam || data.hourly || []).map((h: Record<string, unknown>, i: number) => ({
          hour: (h.hour as string) || (h.jam as string) || String(i),
          served: (h.served as number) || (h.count as number) || (h.jumlah as number) || 0,
        })),
        sessions: (data.sessions || []).map((s: Record<string, unknown>) => ({
          id: (s.id as string) || '',
          card_number: (s.card_number as string) || '',
          status: (s.status as string) || '',
          activated_at: (s.activated_at as string) || '',
          called_at: (s.called_at as string) || null,
          completed_at: (s.completed_at as string) || null,
        })),
      })
    } catch {
      setReport({
        total_served: 0,
        total_skipped: 0,
        avg_wait_minutes: 0,
        hourly_data: [{ hour: '08', served: 0 }, { hour: '09', served: 0 }, { hour: '10', served: 0 }, { hour: '11', served: 0 }, { hour: '12', served: 0 }],
        sessions: [],
      })
    } finally {
      setLoading(false)
    }
  }, [code, date])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API_BASE}/stats/export?date=${date}&counter_code=${code}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `laporan-${code}-${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Generate CSV locally
        generateLocalCSV()
      }
    } catch {
      generateLocalCSV()
    } finally {
      setExporting(false)
    }
  }

  const generateLocalCSV = () => {
    if (!report || report.sessions.length === 0) {
      alert('Tidak ada data untuk diekspor')
      return
    }
    const headers = ['No', 'Nomor Antrian', 'Status', 'Waktu Aktif', 'Waktu Panggil', 'Waktu Selesai']
    const rows = report.sessions.map((s, i) => [
      String(i + 1),
      s.card_number,
      s.status,

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="text-white px-4 py-4" style={{ backgroundColor: color.primary }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/loket/${code}`)} className="p-1.5 rounded-full hover:bg-white/20 transition-all duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">Laporan {counterName}</h1>
            <p className="text-sm opacity-80">Loket {code}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 bg-white/10 rounded-lg p-1">
          <button onClick={() => router.push(`/loket/${code}`)} className="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 text-white/80 hover:text-white">Antrian</button>
          <button className="flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 bg-white text-gray-900">Laporan</button>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Tanggal:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200" />
          <button onClick={handleExportCSV} disabled={exporting} className="ml-auto px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-2">
            {exporting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Memuat laporan...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-md p-5 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Dilayani</p>
                <p className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: color.primary }}>{report?.total_served ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-5 text-center">
                <p className="text-sm text-gray-500 mb-1">Dilewati</p>
                <p className="text-3xl font-bold text-orange-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{report?.total_skipped ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-5 text-center">
                <p className="text-sm text-gray-500 mb-1">Rata-rata Tunggu</p>
                <p className="text-3xl font-bold text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{report?.avg_wait_minutes ?? 0}<span className="text-lg"> mnt</span></p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Pengunjung per Jam</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.hourly_data || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} labelFormatter={(label) => `Jam ${label}:00`} />
                    <Bar dataKey="served" name="Dilayani" fill={color.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 overflow-x-auto">
              <h3 className="font-bold text-gray-900 mb-4">Detail Sesi</h3>
              {report?.sessions && report.sessions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-3 px-2 font-semibold text-gray-600">No</th>
                      <th className="py-3 px-2 font-semibold text-gray-600">Nomor Antrian</th>
                      <th className="py-3 px-2 font-semibold text-gray-600">Status</th>
                      <th className="py-3 px-2 font-semibold text-gray-600">Waktu Aktif</th>
                      <th className="py-3 px-2 font-semibold text-gray-600">Waktu Panggil</th>
                      <th className="py-3 px-2 font-semibold text-gray-600">Waktu Selesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sessions.map((s, i) => (
                      <tr key={s.id || i} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200">
                        <td className="py-3 px-2">{i + 1}</td>
                        <td className="py-3 px-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.card_number}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'done' ? 'bg-green-100 text-green-700' :
                            s.status === 'skipped' ? 'bg-orange-100 text-orange-700' :
                            s.status === 'called' || s.status === 'serving' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{mapStatus(s.status)}</span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{s.activated_at ? new Date(s.activated_at).toLocaleTimeString('id-ID') : '-'}</td>
                        <td className="py-3 px-2 text-gray-600">{s.called_at ? new Date(s.called_at).toLocaleTimeString('id-ID') : '-'}</td>
                        <td className="py-3 px-2 text-gray-600">{s.completed_at ? new Date(s.completed_at).toLocaleTimeString('id-ID') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-8">Tidak ada data untuk tanggal ini</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

