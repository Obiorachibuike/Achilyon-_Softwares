// Compiles the Solidity sources with the bundled solc-js (no network access or
// native toolchain required). Used by `npm run contracts:build` and the tests.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const solc = require('solc')

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SRC = join(ROOT, 'contracts', 'src')
export const SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  // Cancun is live on every EVM network Achilyon supports.
  evmVersion: 'cancun',
  outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.sol') ? [p] : []
  })
}

function findImports(path) {
  const candidates = [join(ROOT, 'node_modules', path), join(SRC, path)]
  for (const c of candidates) {
    try {
      return { contents: readFileSync(c, 'utf8') }
    } catch {
      /* try next */
    }
  }
  return { error: `Import not found: ${path}` }
}

/**
 * @param {{ includeTests?: boolean }} [opts]
 * @returns {{ version: string, contracts: Record<string, { abi: unknown[], bytecode: `0x${string}`, deployedSize: number, source: string }> }}
 */
export function compile({ includeTests = false } = {}) {
  const files = walk(SRC).filter((f) => includeTests || !relative(SRC, f).startsWith('test'))
  const sources = Object.fromEntries(files.map((f) => [relative(SRC, f).split('\\').join('/'), { content: readFileSync(f, 'utf8') }]))
  const input = { language: 'Solidity', sources, settings: SETTINGS }
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  const errors = (output.errors ?? []).filter((e) => e.severity === 'error')
  if (errors.length) throw new Error(errors.map((e) => e.formattedMessage).join('\n'))
  const warnings = (output.errors ?? []).filter((e) => e.severity === 'warning' && !String(e.sourceLocation?.file ?? '').startsWith('@openzeppelin'))
  if (warnings.length) throw new Error(`Compiler warnings are treated as errors:\n${warnings.map((e) => e.formattedMessage).join('\n')}`)
  const contracts = {}
  for (const [source, byName] of Object.entries(output.contracts)) {
    if (source.startsWith('@openzeppelin')) continue
    for (const [name, c] of Object.entries(byName)) {
      if (!c.evm.bytecode.object) continue // interfaces
      contracts[name] = { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}`, deployedSize: c.evm.deployedBytecode.object.length / 2, source }
    }
  }
  return { version: solc.version(), contracts }
}
