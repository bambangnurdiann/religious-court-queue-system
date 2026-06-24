'use client'

import { useEffect, useRef, useState } from 'react'

interface QRScannerProps {
  onScan: (qrCode: string) => void
  isProcessing: boolean
}

export default function QRCodeScanner({ onScan, isProcessing }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!scanning) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            scanQRCode()
          }
        }
      } catch (err) {
        setError('Camera access denied or not available')
        setHasCamera(false)
      }
    }

    startCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [scanning])

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const video = videoRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    // Simulate QR code detection - in production, use a library like jsQR
    // For now, we'll show placeholder behavior
    if (scanning) {
      setTimeout(scanQRCode, 300)
    }
  }

  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value
      if (value.trim()) {
        onScan(value)
        ;(e.target as HTMLInputElement).value = ''
      }
    }
  }

  return (
    <div className="space-y-4">
      {hasCamera && (
        <>
          <button
            onClick={() => setScanning(!scanning)}
            disabled={isProcessing}
            className={`w-full rounded-lg py-2 font-medium transition-colors ${
              scanning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {scanning ? 'Stop Camera' : 'Start Camera'}
          </button>

          {scanning && (
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              <div className="pointer-events-none absolute inset-0 border-2 border-primary opacity-50">
                <div className="absolute inset-8 border-2 border-green-500" />
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Or enter QR code manually:
        </label>
        <input
          type="text"
          placeholder="Paste QR code or card number..."
          onKeyDown={handleManualInput}
          disabled={isProcessing}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>
    </div>
  )
}
