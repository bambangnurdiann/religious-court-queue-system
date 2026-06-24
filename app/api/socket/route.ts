import { Server } from 'socket.io'
import type { NextRequest } from 'next/server'

let io: Server

export function GET(req: NextRequest) {
  if (!io) {
    // Socket.io will be initialized on first connection
  }
  return new Response('Socket.io ready', { status: 200 })
}

export function POST(req: NextRequest) {
  return new Response('Socket.io endpoint', { status: 200 })
}
