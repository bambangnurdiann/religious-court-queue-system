'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import QRCodeScanner from './qr-scanner'
import CardActivationForm from './card-activation-form'
import VisitorCounterSelection from './visitor-counter-selection'
import { activateQueueCard, getQueueCardByQR } from '@/app/actions/queue'
import { toast } from 'sonner'

export default function SatpamDashboard() {
  const [activeTab, setActiveTab] = useState<'visitor' | 'scanner' | 'manual'>('visitor')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastScannedCard, setLastScannedCard] = useState<any>(null)

  const handleQRCodeScanned = async (qrCode: string) => {
    setIsProcessing(true)
    try {
      const cards = await getQueueCardByQR(qrCode)
      
      if (cards.length === 0) {
        toast.error('Card not found', {
          description: 'The scanned QR code does not exist in the system',
        })
        return
      }

      const card = cards[0]
      if (card.isActivated) {
        toast.warning('Already activated', {
          description: `Card ${card.cardNumber} has already been activated`,
        })
        return
      }

      setLastScannedCard(card)
      toast.success('Card found', {
        description: `Found card: ${card.cardNumber}`,
      })
    } catch (error) {
      toast.error('Error scanning card', {
        description: 'An error occurred while scanning the QR code',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleActivateCard = async () => {
    if (!lastScannedCard) return

    setIsProcessing(true)
    try {
      await activateQueueCard(lastScannedCard.id)
      toast.success('Card activated', {
        description: `Card ${lastScannedCard.cardNumber} has been activated successfully`,
      })
      setLastScannedCard(null)
    } catch (error) {
      toast.error('Error activating card', {
        description: 'An error occurred while activating the card',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('visitor')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'visitor'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pilih Loket (Pengunjung)
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'scanner'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Scan QR Code
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'manual'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Input Manual
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'visitor' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 font-semibold text-foreground">Layanan Pengunjung</h2>
            <VisitorCounterSelection />
          </div>
        </div>
      )}

      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 font-semibold text-foreground">Scan QR Code</h2>
            <QRCodeScanner
              onScan={handleQRCodeScanned}
              isProcessing={isProcessing}
            />
          </div>

          {lastScannedCard && (
            <CardConfirmation
              card={lastScannedCard}
              onConfirm={handleActivateCard}
              onCancel={() => setLastScannedCard(null)}
              isProcessing={isProcessing}
            />
          )}
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 font-semibold text-foreground">Manual Card Entry</h2>
          <CardActivationForm onCardActivated={() => setLastScannedCard(null)} />
        </div>
      )}
    </div>
  )
}

function CardConfirmation({
  card,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  card: any
  onConfirm: () => void
  onCancel: () => void
  isProcessing: boolean
}) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <h3 className="mb-2 font-semibold text-green-900">Confirm Card Activation</h3>
      <div className="mb-4 space-y-1">
        <p className="text-sm text-green-800">
          <span className="font-medium">Card Number:</span> {card.cardNumber}
        </p>
        <p className="text-sm text-green-800">
          <span className="font-medium">QR Code:</span> {card.qrCode.slice(0, 20)}...
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700"
        >
          Activate Card
        </Button>
        <Button
          onClick={onCancel}
          disabled={isProcessing}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
