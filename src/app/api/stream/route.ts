import type { NextRequest } from 'next/server'
import { publicConfig } from '@/lib/config'
import { tokenKey } from '@/lib/blockchain/chains'
import { getMarketProvider } from '@/lib/blockchain/providers'
import { getEngine, type EngineEvent } from '@/services/demo/engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/stream — server-sent event transport for market overlays.
 *
 * Demo mode streams the local simulation engine.
 * Live mode snapshots the real market provider on a bounded cadence and
 * emits only observable market values. This keeps the UI responsive on
 * serverless hosting without pretending that third-party APIs provide a
 * browser WebSocket endpoint.
 *
 * The transport is intentionally provider-agnostic: a dedicated WebSocket
 * indexer can replace this route later without changing the UI consumers.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          close()
        }
      }

      const sendLiveSnapshot = async () => {
        if (closed || publicConfig.demoMode) return
        try {
          const tokens = await getMarketProvider().listTokens()
          for (const t of tokens.slice(0, 200)) {
            send('price', {
              key: tokenKey(t.token.chain, t.token.address),
              priceUsd: t.market.priceUsd,
              change24h: t.market.priceChange.h24,
              marketCap: t.market.marketCap,
              volume24h: t.market.volume.h24,
              progress: t.curve?.progress ?? null,
              at: t.market.updatedAt,
            })
          }
          send('refresh', { t: Date.now() })
        } catch (error) {
          console.warn('[achilyon] live stream snapshot failed', error)
          send('provider-error', { message: 'Live market snapshot temporarily unavailable', t: Date.now() })
        }
      }

      const onDemoEvent = (e: EngineEvent) => send(e.type, e)
      const engine = getEngine()
      const unsubscribe = publicConfig.demoMode ? engine.subscribe(onDemoEvent) : () => {}

      // Keep the cadence deliberately bounded. The provider itself caches
      // market discovery, so multiple browser clients do not fan out one API
      // request per second.
      const ticker = publicConfig.demoMode
        ? setInterval(() => engine.sync(), 1_000)
        : setInterval(() => void sendLiveSnapshot(), 15_000)
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
      send('hello', { demo: publicConfig.demoMode, transport: 'sse', t: Date.now() })

      if (!publicConfig.demoMode) void sendLiveSnapshot()
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}
