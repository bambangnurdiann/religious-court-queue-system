import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function initializeSocket(): Socket {
  if (socket && socket.connected) {
    return socket
  }

  socket = io(undefined, {
    path: '/api/socket',
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('[v0] Socket connected:', socket?.id)
  })

  socket.on('disconnect', () => {
    console.log('[v0] Socket disconnected')
  })

  socket.on('error', (error: any) => {
    console.error('[v0] Socket error:', error)
  })

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

// Queue-related events
export function emitQueueUpdate(data: {
  sessionId: number
  counterId: number
  entryId: number
  status: string
}) {
  if (socket && socket.connected) {
    socket.emit('queue:update', data)
  }
}

export function emitCallNext(data: {
  sessionId: number
  counterId: number
  queueNumber: string
}) {
  if (socket && socket.connected) {
    socket.emit('queue:call-next', data)
  }
}

export function emitQueuePosition(data: {
  cardId: number
  sessionId: number
  position: number
  aheadCount: number
}) {
  if (socket && socket.connected) {
    socket.emit('queue:position-update', data)
  }
}

// Listener setup functions
export function onQueueUpdate(
  callback: (data: any) => void
) {
  if (socket) {
    socket.on('queue:update', callback)
  }
}

export function onCallNext(callback: (data: any) => void) {
  if (socket) {
    socket.on('queue:call-next', callback)
  }
}

export function onQueuePositionUpdate(callback: (data: any) => void) {
  if (socket) {
    socket.on('queue:position-update', callback)
  }
}

export function offQueueUpdate() {
  if (socket) {
    socket.off('queue:update')
  }
}

export function offCallNext() {
  if (socket) {
    socket.off('queue:call-next')
  }
}

export function offQueuePositionUpdate() {
  if (socket) {
    socket.off('queue:position-update')
  }
}
