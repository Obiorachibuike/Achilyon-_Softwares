#!/usr/bin/env node
/**
 * Local development chain: an in-process EVM (Hardhat EDR, Cancun, chain id
 * 31337) served as JSON-RPC over HTTP. Use it to try on-chain launches and
 * trades end to end without a public network:
 *
 *   npm run contracts:node                    # http://127.0.0.1:8545
 *   PORT=9545 HOST=0.0.0.0 npm run contracts:node
 *
 * The pre-funded accounts use Hardhat's well-known development keys — they are
 * PUBLIC. Never send real funds to them or use them on any real network.
 */
import { createServer } from 'node:http'
import { createHardhatRuntimeEnvironment } from 'hardhat/hre'

const PORT = Number(process.env.PORT ?? 8545)
const HOST = process.env.HOST ?? '127.0.0.1'
const MAX_BODY = 5 * 1024 * 1024

const hre = await createHardhatRuntimeEnvironment(
  { networks: { local: { type: 'edr-simulated', chainType: 'l1', hardfork: 'cancun', chainId: 31337 } } },
  {},
  process.cwd(),
)
const { provider } = await hre.network.connect('local')

async function handle(msg) {
  const base = { jsonrpc: '2.0', id: msg?.id ?? null }
  if (!msg || typeof msg.method !== 'string') return { ...base, error: { code: -32600, message: 'Invalid request' } }
  try {
    return { ...base, result: await provider.request({ method: msg.method, params: msg.params ?? [] }) }
  } catch (e) {
    return { ...base, error: { code: typeof e?.code === 'number' ? e.code : -32603, message: e?.message ?? 'Internal error', ...(e?.data !== undefined ? { data: e.data } : {}) } }
  }
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.method !== 'POST') return res.writeHead(405).end()
  let body = ''
  req.on('data', (c) => {
    body += c
    if (body.length > MAX_BODY) req.destroy()
  })
  req.on('end', async () => {
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      return res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }))
    }
    const out = Array.isArray(parsed) ? await Promise.all(parsed.map(handle)) : await handle(parsed)
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out, (_k, v) => (typeof v === 'bigint' ? `0x${v.toString(16)}` : v)))
  })
})

server.listen(PORT, HOST, async () => {
  const accounts = await provider.request({ method: 'eth_accounts' })
  console.log(`Local EVM (chain id 31337) listening on http://${HOST}:${PORT}`)
  console.log(`${accounts.length} pre-funded development accounts, e.g. ${accounts[0]}`)
  console.log('These use PUBLIC Hardhat development keys — local testing only.')
})
