import type { NextRequest } from 'next/server'
import { publicConfig } from '@/lib/config'
import { getEngine, type EngineEvent } from '@/services/demo/engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stream — Server-Sent Events.
 *
 * Demo mode streams simulated engine events (prices, trades, launches).
 * In live mode, launchpad (demo) events are streamed and clients fall back to
 * polling for DEX market data. Connections are closed after ~55s so they fit
 * serverless time limits; EventSource reconnects automatically.
 */
export async function GET(req: NextRequest) {
  const engine = getEngine()
  const encoder = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch { close() }
      }
      const onEvent = (e: EngineEvent) => {
        if (!publicConfig.demoMode && e.type === 'price' && !e.progress) return
        send(e.type, e)
      }
      const unsubscribe = engine.subscribe(onEvent)
      const ticker = setInterval(() => engine.sync(), 1_000)
      const heartbeat = setInterval(() => send('ping', { t: Date.now() }), 15_000)
      const timeout = setTimeout(() => close(), 55_000)
      function close() {
        if (closed) return
        closed = true
        unsubscribe()
        clearInterval(ticker)
        clearInterval(heartbeat)
        clearTimeout(timeout)
        try { controller.close() } catch { /* already closed */ }
      }
      cleanup = close
      req.signal.addEventListener('abort', close)
      controller.enqueue(encoder.encode('retry: 3000\n\n'))
      send('hello', { demo: publicConfig.demoMode, t: Date.now() })
    },
    cancel() { cleanup() },
  })
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' },
  })
}
