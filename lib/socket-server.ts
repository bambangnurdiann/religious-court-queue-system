import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id)

    // Join counter room
    socket.on('join:counter', (counterCode: string) => {
      socket.join(`counter:${counterCode}`)
      console.log(`[Socket] ${socket.id} joined counter:${counterCode}`)
    })

    // Join visitor room
    socket.on('join:visitor', (qrToken: string) => {
      socket.join(`visitor:${qrToken}`)
      console.log(`[Socket] ${socket.id} joined visitor:${qrToken}`)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id)
    })
  })

  return io
}

export function getSocketIO(): SocketIOServer | null {
  return io
}
