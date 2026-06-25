'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VisitorPage() {
  const router = useRouter()
  const [cardNumber, setCardNumber] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Cek Status Antrian</h1>
        <p className="text-gray-500 text-center mb-6">Masukkan nomor antrian Anda untuk melihat posisi antrian</p>
        <div className="space-y-4">
          <input
            type="text"
            value={cardNumber}
            onChange={e => setCardNumber(e.target.value)}
            placeholder="Masukkan nomor antrian Anda..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            onKeyDown={e => { if (e.key === 'Enter' && cardNumber.trim()) router.push(`/q/${cardNumber.trim()}`) }}
          />
          <button
            onClick={() => cardNumber.trim() && router.push(`/q/${cardNumber.trim()}`)}
            disabled={!cardNumber.trim()}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
          >
            Lihat Status
          </button>
        </div>
      </div>
    </div>
  )
}
