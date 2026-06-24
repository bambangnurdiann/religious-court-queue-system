'use client'

import { Button } from '@/components/ui/button'

interface QueueBoardProps {
  counter: any
  entries: any[]
  onCallNext: () => void
  onCompleteVisitor: (entryId: number) => void
}

export default function QueueBoard({
  counter,
  entries,
  onCallNext,
  onCompleteVisitor,
}: QueueBoardProps) {
  const inServiceEntry = entries.find((e) => e.status === 'in_service')
  const waitingEntries = entries.filter((e) => e.status === 'waiting')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Current Service */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Now Serving
          </h3>
          {inServiceEntry ? (
            <div>
              <div
                className={`mb-4 rounded-lg p-4 text-center ${
                  counter.colorClass === 'blue'
                    ? 'bg-blue-100'
                    : counter.colorClass === 'green'
                      ? 'bg-green-100'
                      : counter.colorClass === 'orange'
                        ? 'bg-orange-100'
                        : counter.colorClass === 'purple'
                          ? 'bg-purple-100'
                          : 'bg-teal-100'
                }`}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Counter {counter.counterNumber}
                </p>
                <p className="text-4xl font-bold font-mono">
                  {inServiceEntry.queueNumber}
                </p>
              </div>
              <Button
                onClick={() => onCompleteVisitor(inServiceEntry.id)}
                className="w-full"
              >
                Mark Complete
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">No one being served</p>
              <Button
                onClick={onCallNext}
                className="mt-3 w-full"
                variant="default"
              >
                Call Next
              </Button>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Queue Status
          </h3>
          <div className="flex justify-between">
            <div>
              <p className="text-2xl font-bold font-mono">{waitingEntries.length}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {entries.filter((e) => e.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">Waiting Queue</h3>
        </div>
        <div className="divide-y divide-border">
          {waitingEntries.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No visitors waiting in queue
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {waitingEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-mono font-semibold text-foreground">
                        {entry.queueNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.visitorName || 'No name'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.arrivalTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
