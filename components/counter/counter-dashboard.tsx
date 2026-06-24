'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCounter,
  getCounters,
  getTodaySession,
  createDailySession,
  getQueueEntriesByCounter,
  updateQueueEntryStatus,
  getNextQueueEntry,
} from '@/app/actions/queue'
import {
  initializeSocket,
  onQueueUpdate,
  onCallNext,
  offQueueUpdate,
  offCallNext,
} from '@/lib/socket'
import { toast } from 'sonner'
import QueueBoard from './queue-board'

export default function CounterDashboard() {
  const [counters, setCounters] = useState<any[]>([])
  const [selectedCounter, setSelectedCounter] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [queueEntries, setQueueEntries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewCounterForm, setShowNewCounterForm] = useState(false)
  const [counterName, setCounterName] = useState('')
  const [counterNumber, setCounterNumber] = useState('')

  const counterColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
    { value: 'green', label: 'Green', class: 'bg-green-600' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-600' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-600' },
  ]
  const [selectedColor, setSelectedColor] = useState('blue')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [countersData, sessionData] = await Promise.all([
        getCounters(),
        getTodaySession(),
      ])

      setCounters(countersData)

      if (sessionData.length > 0) {
        setSession(sessionData[0])
        if (selectedCounter) {
          const entries = await getQueueEntriesByCounter(
            sessionData[0].id,
            selectedCounter.id
          )
          setQueueEntries(entries)
        }
      } else {
        // Create a new session if none exists
        const newSession = await createDailySession()
        setSession(newSession)
      }
    } catch (error) {
      toast.error('Error loading data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCounter = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!counterName.trim() || !counterNumber.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const newCounter = await createCounter({
        counterNumber: parseInt(counterNumber),
        name: counterName,
        colorClass: selectedColor,
      })

      setCounters([...counters, newCounter])
      setCounterName('')
      setCounterNumber('')
      setSelectedColor('blue')
      setShowNewCounterForm(false)
      toast.success('Counter created')
    } catch (error) {
      toast.error('Error creating counter')
    }
  }

  const handleSelectCounter = async (counter: any) => {
    setSelectedCounter(counter)
    if (session) {
      const entries = await getQueueEntriesByCounter(session.id, counter.id)
      setQueueEntries(entries)
    }
  }

  const handleCallNext = async () => {
    if (!selectedCounter || !session) return

    try {
      const nextEntry = await getNextQueueEntry(selectedCounter.id, session.id)
      if (nextEntry) {
        await updateQueueEntryStatus(nextEntry.id, 'in_service')
        await loadData()
        handleSelectCounter(selectedCounter)
        toast.success(`Calling: ${nextEntry.queueNumber}`)
      } else {
        toast.info('No more visitors in queue')
      }
    } catch (error) {
      toast.error('Error calling next visitor')
    }
  }

  const handleCompleteVisitor = async (entryId: number) => {
    try {
      await updateQueueEntryStatus(entryId, 'completed')
      await loadData()
      handleSelectCounter(selectedCounter)
      toast.success('Visitor marked as completed')
    } catch (error) {
      toast.error('Error updating visitor status')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Counters Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Counters</h2>
          <Button
            onClick={() => setShowNewCounterForm(!showNewCounterForm)}
            size="sm"
          >
            {showNewCounterForm ? 'Cancel' : 'New Counter'}
          </Button>
        </div>

        {showNewCounterForm && (
          <form onSubmit={handleCreateCounter} className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Counter Number</label>
                <Input
                  type="number"
                  value={counterNumber}
                  onChange={(e) => setCounterNumber(e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Counter Name</label>
                <Input
                  value={counterName}
                  onChange={(e) => setCounterName(e.target.value)}
                  placeholder="e.g., Information"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {counterColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      selectedColor === color.value
                        ? `${color.class} border-foreground`
                        : `${color.class} border-transparent opacity-60`
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create Counter
            </Button>
          </form>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counters.map((counter) => (
            <button
              key={counter.id}
              onClick={() => handleSelectCounter(counter)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedCounter?.id === counter.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    counter.colorClass === 'blue'
                      ? 'bg-blue-600'
                      : counter.colorClass === 'green'
                        ? 'bg-green-600'
                        : counter.colorClass === 'orange'
                          ? 'bg-orange-600'
                          : counter.colorClass === 'purple'
                            ? 'bg-purple-600'
                            : 'bg-teal-600'
                  }`}
                />
                <span className="font-semibold text-foreground">
                  Counter {counter.counterNumber}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{counter.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Queue Display */}
      {selectedCounter && session && (
        <QueueBoard
          counter={selectedCounter}
          entries={queueEntries}
          onCallNext={handleCallNext}
          onCompleteVisitor={handleCompleteVisitor}
        />
      )}
    </div>
  )
}
