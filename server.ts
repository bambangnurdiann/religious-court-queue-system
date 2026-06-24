import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketIO } from './lib/socket-server'
import { startCronJobs } from './lib/cron'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true)
    await handle(req, res, parsedUrl)
  })

  // Initialize Socket.io
  const io = initSocketIO(httpServer)
  console.log('[Server] Socket.io initialized')

  // Start cron jobs
  startCronJobs()

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
