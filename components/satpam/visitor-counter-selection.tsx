'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCounters, generateVisitorQueueEntry } from '@/app/actions/queue'
import { toast } from 'sonner'
import QRCodeComponent from 'qrcode.react'
import dynamic from 'next/dynamic'

// Dynamic import untuk menghindari SSR issues
const QRCode = dynamic(() => import('qrcode.react'), { ssr: false })

interface GeneratedQueue {
  queueNumber: string
  qrCode: string
  position: number
  cardId: number
}

export default function VisitorCounterSelection() {
  const [counters, setCounters] = useState<any[]>([])
  const [selectedCounter, setSelectedCounter] = useState<number | null>(null)
  const [visitorName, setVisitorName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQueue, setGeneratedQueue] = useState<GeneratedQueue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCounters()
  }, [])

  const loadCounters = async () => {
    try {
      const data = await getCounters()
      setCounters(data)
    } catch (error) {
      toast.error('Error loading counters')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQueue = async () => {
    if (!selectedCounter) {
      toast.error('Please select a counter')
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateVisitorQueueEntry({
        counterId: selectedCounter,
        visitorName: visitorName || undefined,
      })

      setGeneratedQueue({
        queueNumber: result.queueNumber,
        qrCode: result.qrCode,
        position: result.position,
        cardId: result.card.id,
      })

      toast.success('Queue generated', {
        description: `Queue number: ${result.queueNumber}`,
      })
    } catch (error) {
      toast.error('Error generating queue')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setGeneratedQueue(null)
    setSelectedCounter(null)
    setVisitorName('')
  }

  const counterColorMap: Record<string, string> = {
    blue: 'bg-blue-100 border-blue-300 text-blue-900',
    green: 'bg-green-100 border-green-300 text-green-900',
    orange: 'bg-orange-100 border-orange-300 text-orange-900',
    purple: 'bg-purple-100 border-purple-300 text-purple-900',
    teal: 'bg-teal-100 border-teal-300 text-teal-900',
  }

  if (loading) {
    return <div className="text-center py-8">Loading counters...</div>
  }

  if (generatedQueue) {
    return (
      <div className="space-y-6">
        {/* Generated Queue Display */}
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Nomor Antrian Anda</CardTitle>
            <CardDescription className="text-green-800">
              Tunjukkan QR Code ini kepada petugas untuk aktivasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Queue Number */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">NOMOR ANTRIAN</p>
              <p className="text-5xl font-bold text-green-900 font-mono">
                {generatedQueue.queueNumber}
              </p>
              <p className="mt-3 text-sm text-green-800">
                Posisi dalam antrian: <span className="font-bold">{generatedQueue.position}</span>
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <QRCode
                  value={generatedQueue.qrCode}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground mb-2">Instruksi:</p>
              <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                <li>Tunjukkan nomor antrian dan QR code ini kepada petugas</li>
                <li>Petugas akan scan QR code menggunakan aplikasi scanner</li>
                <li>Setelah scan, Anda bisa tracking posisi antrian di halaman status</li>
                <li>Gunakan nomor kartu untuk tracking: <span className="font-mono font-semibold text-foreground">{generatedQueue.qrCode}</span></li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Buat Antrian Baru
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                Lihat Status Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pilih Loket Layanan</CardTitle>
          <CardDescription>
            Silakan pilih loket yang ingin Anda tuju
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Counter Selection Grid */}
          <div>
            <Label className="mb-4 block text-sm font-semibold">Loket Tersedia</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {counters.map((counter) => (
                <button
                  key={counter.id}
                  onClick={() => setSelectedCounter(counter.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCounter === counter.id
                      ? `${counterColorMap[counter.colorClass] || counterColorMap.blue} border-current scale-105`
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="text-sm font-semibold">Loket {counter.counterNumber}</p>
                  <p className="text-xs mt-1">{counter.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Visitor Name */}
          <div>
            <Label htmlFor="visitorName" className="text-sm font-semibold">
              Nama Pengunjung (Opsional)
            </Label>
            <Input
              id="visitorName"
              placeholder="Masukkan nama Anda"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateQueue}
            disabled={!selectedCounter || isGenerating}
            className="w-full bg-primary hover:bg-primary/90 text-white py-2"
          >
            {isGenerating ? 'Membuat Nomor Antrian...' : 'Buat Nomor Antrian'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
