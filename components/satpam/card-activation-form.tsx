'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getQueueCardByQR, activateQueueCard } from '@/app/actions/queue'
import { toast } from 'sonner'

interface CardActivationFormProps {
  onCardActivated?: () => void
}

export default function CardActivationForm({
  onCardActivated,
}: CardActivationFormProps) {
  const [qrCode, setQrCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!qrCode.trim()) {
      toast.error('Please enter a QR code or card number')
      return
    }

    setIsLoading(true)
    try {
      const cards = await getQueueCardByQR(qrCode)

      if (cards.length === 0) {
        toast.error('Card not found', {
          description: 'No card exists with this QR code',
        })
        return
      }

      const card = cards[0]

      if (card.isActivated) {
        toast.warning('Already activated', {
          description: `Card ${card.cardNumber} is already activated`,
        })
        return
      }

      await activateQueueCard(card.id)
      toast.success('Card activated', {
        description: `Card ${card.cardNumber} activated successfully`,
      })

      setQrCode('')
      onCardActivated?.()
    } catch (error) {
      toast.error('Error activating card', {
        description: 'An error occurred. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="qrCode"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          QR Code or Card Number
        </label>
        <Input
          id="qrCode"
          type="text"
          value={qrCode}
          onChange={(e) => setQrCode(e.target.value)}
          placeholder="Enter QR code or card number"
          disabled={isLoading}
          className="font-mono"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Activating...' : 'Activate Card'}
      </Button>
    </form>
  )
}
