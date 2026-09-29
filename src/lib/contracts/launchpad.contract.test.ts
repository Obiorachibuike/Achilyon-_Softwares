import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BaseError, ContractFunctionRevertedError, parseEther, parseEventLogs, parseSignature, type Abi, type Address } from 'viem'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { achilyonLaunchpadAbi, launchTokenAbi } from './abi'
import { applyBuyExact, applySellExact, initialCurve, quoteSellExact, type OnchainCurve } from './curveMath'
import { launchpadAbiWithErrors } from './launchpad'
import { artifacts, deployLaunchpad, START_MCAP, startChain, type TestChain } from '@/test/evm'
import { compile, ROOT } from '../../../contracts/tooling/compile.mjs'
import { PUBLISHED, renderAbiModule, renderArtifact } from '../../../contracts/tooling/build.mjs'
import { mulberry32 } from '@/data/mock/prng'

let chain: TestChain
let launchpad: Address
let migrator: Address
let owner: Address, feeRecipient: Address, alice: Address, bob: Address, carol: Address
const SUPPLY = parseEther('1000000000')

beforeAll(async () => {
  chain = await startChain()
  ;[owner, alice, bob, carol] = chain.accounts as [Address, Address, Address, Address]
  const d = await deployLaunchpad(chain)
  launchpad = d.address
  feeRecipient = d.feeRecipient
  migrator = d.migrator
})
afterAll(() => chain?.close())

// ─── helpers ────────────────────────────────────────────────────────────────
const deadline = async (s = 600) => (await chain.now()) + BigInt(s)

async function send(from: Address, functionName: string, args: readonly unknown[] = [], value = 0n, address: Address = launchpad, abi: Abi = launchpadAbiWithErrors as Abi) {
  const { request } = await chain.publicClient.simulateContract({ account: from, address, abi, functionName, args, value })
  const hash = await chain.wallet(from).writeContract(request as never)
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  expect(receipt.status).toBe('success')
  return receipt
}

async function revertOf(from: Address, functionName: string, args: readonly unknown[] = [], value = 0n, address: Address = launchpad): Promise<string> {
  try {
    await chain.publicClient.simulateContract({ account: from, address, abi: launchpadAbiWithErrors, functionName, args, value } as never)
  } catch (e) {
    const r = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName ?? r.reason ?? 'unknown'
    throw e
  }
  throw new Error(`${functionName} did not revert`)
}

const read = <T>(functionName: string, args: readonly unknown[] = [], address: Address = launchpad, abi: Abi = achilyonLaunchpadAbi as Abi) =>
  chain.publicClient.readContract({ address, abi, functionName, args }) as Promise<T>

async function curveOf(token: Address): Promise<OnchainCurve> {
  const c = await read<OnchainCurve & { feeBps: number | bigint }>('getCurve', [token])
  return { ...c, feeBps: Number(c.feeBps) }
}

const params = (o: Partial<{ name: string; symbol: string; metadataURI: string; totalSupply: bigint; curveBps: number; creatorBps: number }> = {}) => ({
  name: 'Achilyon Test', symbol: 'ACHT', metadataURI: '', totalSupply: SUPPLY, curveBps: 8000, creatorBps: 0, ...o,
})

async function launch(from: Address, o: Parameters<typeof params>[0] = {}, value = 0n): Promise<Address> {
  const receipt = await send(from, 'createToken', [params(o), 0n, await deadline()], value)
  const ev = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'TokenCreated' })[0]
  if (!ev) throw new Error('no TokenCreated')
  return ev.args.token
}

const balanceOf = (token: Address, who: Address) => read<bigint>('balanceOf', [who], token, launchTokenAbi as Abi)
const gasCost = (r: { gasUsed: bigint; effectiveGasPrice: bigint }) => r.gasUsed * r.effectiveGasPrice

// ─── tests ──────────────────────────────────────────────────────────────────

describe('build artifacts', () => {
  it('committed artifacts and ABI module match the Solidity sources', () => {
    const { version, contracts } = compile()
    for (const name of PUBLISHED) {
      expect(readFileSync(join(ROOT, 'contracts', 'artifacts', `${name}.json`), 'utf8'), `${name}.json is stale — run npm run contracts:build`).toBe(renderArtifact(name, contracts[name]!, version))
    }
    expect(readFileSync(join(ROOT, 'src', 'lib', 'contracts', 'abi.ts'), 'utf8'), 'abi.ts is stale — run npm run contracts:build').toBe(renderAbiModule(contracts, version))
  })

  it('fits the EIP-170 contract size limit', () => {
    expect(artifacts().AchilyonLaunchpad!.deployedSize).toBeLessThan(24_576)
  })

  it('LaunchToken has no privileged functions (no owner, mint, pause or blacklist)', () => {
    const writes = (launchTokenAbi as readonly { type: string; name?: string; stateMutability?: string }[]).filter((x) => x.type === 'function' && x.stateMutability !== 'view' && x.stateMutability !== 'pure').map((x) => x.name).sort()
    expect(writes).toEqual(['approve', 'permit', 'transfer', 'transferFrom'])
  })
})

describe('deployment', () => {
  it('rejects unsafe constructor arguments', async () => {
    const zero = '0x0000000000000000000000000000000000000000'
    await expect(chain.deploy('AchilyonLaunchpad', [owner, feeRecipient, START_MCAP, 201, migrator])).rejects.toThrow()
    await expect(chain.deploy('AchilyonLaunchpad', [owner, zero, START_MCAP, 100, migrator])).rejects.toThrow()
    await expect(chain.deploy('AchilyonLaunchpad', [owner, feeRecipient, START_MCAP, 100, zero])).rejects.toThrow()
    await expect(chain.deploy('AchilyonLaunchpad', [owner, feeRecipient, 0n, 100, migrator])).rejects.toThrow()
    expect(await read<Address>('migrator')).toBe(migrator)
  })
})

describe('createToken', () => {
  it('mints the supply, sets up the curve exactly like the TS model and emits metadata', async () => {
    const receipt = await send(alice, 'createToken', [params({ creatorBps: 500, curveBps: 7500, metadataURI: 'data:application/json;base64,e30=' }), 0n, await deadline()])
    const ev = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'TokenCreated' })[0]!
    const token = ev.args.token
    expect(ev.args).toMatchObject({ creator: alice, name: 'Achilyon Test', symbol: 'ACHT', metadataURI: 'data:application/json;base64,e30=', totalSupply: SUPPLY, curveBps: 7500, creatorBps: 500, feeBps: 100 })

    const expected = initialCurve({ creator: alice, totalSupply: SUPPLY, curveBps: 7500, creatorBps: 500, startMarketCapQuote: START_MCAP, feeBps: 100 })
    expect(await curveOf(token)).toEqual(expected)
    expect(await balanceOf(token, alice)).toBe(SUPPLY / 20n) // 5% creator allocation
    expect(await balanceOf(token, launchpad)).toBe(expected.curveSupply + expected.liquidityTokens)
    expect(await read<bigint>('totalSupply', [], token, launchTokenAbi as Abi)).toBe(SUPPLY)
    expect(await read<Address>('creator', [], token, launchTokenAbi as Abi)).toBe(alice)

    // Starting market cap = spot price × supply = startMarketCapQuote (within rounding).
    const spot = await read<bigint>('spotPrice', [token])
    const mcap = (spot * SUPPLY) / 10n ** 18n
    expect(Number(mcap - START_MCAP)).toBeLessThan(1e6)
  })

  it('validates name, symbol, supply, metadata size and allocations', async () => {
    const d = await deadline()
    expect(await revertOf(alice, 'createToken', [params({ name: '' }), 0n, d])).toBe('InvalidName')
    expect(await revertOf(alice, 'createToken', [params({ name: 'x'.repeat(33) }), 0n, d])).toBe('InvalidName')
    expect(await revertOf(alice, 'createToken', [params({ symbol: 'TOOLONGTICK' }), 0n, d])).toBe('InvalidSymbol')
    expect(await revertOf(alice, 'createToken', [params({ metadataURI: 'x'.repeat(2049) }), 0n, d])).toBe('InvalidMetadata')
    expect(await revertOf(alice, 'createToken', [params({ totalSupply: parseEther('999999') }), 0n, d])).toBe('InvalidSupply')
    expect(await revertOf(alice, 'createToken', [params({ curveBps: 4999 }), 0n, d])).toBe('InvalidAllocation')
    expect(await revertOf(alice, 'createToken', [params({ creatorBps: 1001, curveBps: 7000 }), 0n, d])).toBe('InvalidAllocation')
    expect(await revertOf(alice, 'createToken', [params({ curveBps: 9000, creatorBps: 500 }), 0n, d])).toBe('InvalidAllocation') // liquidity < 10%
  })

  it('rejects expired deadlines', async () => {
    expect(await revertOf(alice, 'createToken', [params(), 0n, (await chain.now()) - 1n])).toBe('DeadlineExpired')
  })

  it('spends msg.value as the creator’s initial buy, enforcing minTokensOut', async () => {
    const value = parseEther('0.5')
    const expected = applyBuyExact(initialCurve({ creator: bob, totalSupply: SUPPLY, curveBps: 8000, creatorBps: 0, startMarketCapQuote: START_MCAP, feeBps: 100 }), value)
    expect(await revertOf(bob, 'createToken', [params(), expected.quote.tokensOut + 1n, await deadline()], value)).toBe('SlippageExceeded')
    const token = await launch(bob, {}, value)
    expect(await balanceOf(token, bob)).toBe(expected.quote.tokensOut)
    expect(await curveOf(token)).toEqual(expected.curve)
  })
})

describe('trading', () => {
  it('buy matches the quote view and the exact TS maths, and accrues the fee', async () => {
    const token = await launch(alice)
    const before = await curveOf(token)
    const value = parseEther('1')
    const [viewOut, viewFee] = await read<[bigint, bigint, bigint]>('quoteBuy', [token, value])
    const exact = applyBuyExact(before, value)
    expect(viewOut).toBe(exact.quote.tokensOut)
    expect(viewFee).toBe(exact.quote.fee)
    const feesBefore = await read<bigint>('accruedFees')

    const receipt = await send(carol, 'buy', [token, exact.quote.tokensOut, await deadline()], value)
    expect(await balanceOf(token, carol)).toBe(exact.quote.tokensOut)
    expect(await curveOf(token)).toEqual(exact.curve)
    expect(await read<bigint>('accruedFees')).toBe(feesBefore + exact.quote.fee)
    const trade = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'Trade' })[0]!
    expect(trade.args).toMatchObject({ token, trader: carol, isBuy: true, quoteAmount: value, tokenAmount: exact.quote.tokensOut, fee: exact.quote.fee })
  })

  it('enforces slippage and deadlines on buys and sells', async () => {
    const token = await launch(alice)
    const [out] = await read<[bigint]>('quoteBuy', [token, parseEther('1')])
    expect(await revertOf(bob, 'buy', [token, out + 1n, await deadline()], parseEther('1'))).toBe('SlippageExceeded')
    expect(await revertOf(bob, 'buy', [token, 0n, (await chain.now()) - 1n], parseEther('1'))).toBe('DeadlineExpired')
    expect(await revertOf(bob, 'buy', [token, 0n, await deadline()], 0n)).toBe('ZeroAmount')
    await send(bob, 'buy', [token, 0n, await deadline()], parseEther('1'))
    await send(bob, 'approve', [launchpad, 2n ** 256n - 1n], 0n, token, launchTokenAbi as Abi)
    const [quoteOut] = await read<[bigint]>('quoteSell', [token, out / 2n])
    expect(await revertOf(bob, 'sell', [token, out / 2n, quoteOut + 1n, await deadline()])).toBe('SlippageExceeded')
  })

  it('sell round-trip returns the buy minus ~2 fees and pays the seller in ETH', async () => {
    const token = await launch(alice)
    const value = parseEther('2')
    await send(bob, 'buy', [token, 0n, await deadline()], value)
    const tokens = await balanceOf(token, bob)
    await send(bob, 'approve', [launchpad, tokens], 0n, token, launchTokenAbi as Abi)
    const ethBefore = await chain.publicClient.getBalance({ address: bob })
    const exact = applySellExact(await curveOf(token), tokens)
    const receipt = await send(bob, 'sell', [token, tokens, exact.quote.quoteOut, await deadline()])
    const ethAfter = await chain.publicClient.getBalance({ address: bob })
    expect(ethAfter - ethBefore + gasCost(receipt)).toBe(exact.quote.quoteOut)
    expect(exact.quote.quoteOut).toBeLessThan(value)
    expect(exact.quote.quoteOut).toBeGreaterThan((value * 97n) / 100n)
    expect(await curveOf(token)).toEqual(exact.curve)
  })

  it('differential fuzz: 60 random trades keep contract state identical to the TS port and stay solvent', async () => {
    const token = await launch(alice)
    const traders = [bob, carol, chain.accounts[4]!, chain.accounts[5]!]
    for (const t of traders) await send(t, 'approve', [launchpad, 2n ** 256n - 1n], 0n, token, launchTokenAbi as Abi)
    const rng = mulberry32(42)
    let model = await curveOf(token)
    let executed = 0
    let sells = 0
    for (let i = 0; i < 60; i++) {
      executed++
      const who = traders[Math.floor(rng() * traders.length)]!
      const held = await balanceOf(token, who)
      if (rng() < 0.6 || held === 0n) {
        const value = BigInt(Math.floor(rng() * 4e5)) * 10n ** 12n + 1n // up to ~0.4 ETH, odd wei amounts
        const next = applyBuyExact(model, value)
        await send(who, 'buy', [token, next.quote.tokensOut, await deadline()], value)
        model = next.curve
      } else {
        const amount = (held * BigInt(1 + Math.floor(rng() * 100))) / 100n
        const next = applySellExact(model, amount)
        await send(who, 'sell', [token, amount, next.quote.quoteOut, await deadline()])
        model = next.curve
        sells++
      }
      if (i % 10 === 9) expect(await curveOf(token)).toEqual(model)
      // Solvency: the reserve always covers buying back every sold token (pre-cap maths).
      const sold = model.curveSupply - model.realTokenReserve
      if (sold > 0n) expect(quoteSellExact({ ...model, complete: false, realQuoteReserve: 2n ** 200n }, sold).gross).toBeLessThanOrEqual(model.realQuoteReserve)
      if (model.complete) break
    }
    expect(await curveOf(token)).toEqual(model)
    expect(executed).toBe(60)
    expect(sells).toBeGreaterThan(10)
    expect(await chain.publicClient.getBalance({ address: launchpad })).toBeGreaterThanOrEqual(model.realQuoteReserve)
  })

  it('clips the final buy at the curve end, refunds the excess and completes the curve', async () => {
    const token = await launch(alice)
    const before = await curveOf(token)
    const value = parseEther('100') // far more than the ~4.8 ETH needed to complete
    const exact = applyBuyExact(before, value)
    expect(exact.quote.capped).toBe(true)
    const ethBefore = await chain.publicClient.getBalance({ address: carol })
    const receipt = await send(carol, 'buy', [token, 0n, await deadline()], value)
    const spent = ethBefore - (await chain.publicClient.getBalance({ address: carol })) - gasCost(receipt)
    expect(spent).toBe(exact.quote.net + exact.quote.fee)
    expect(exact.quote.refund).toBe(value - spent)
    expect(await balanceOf(token, carol)).toBe(before.curveSupply)
    const after = await curveOf(token)
    expect(after.complete).toBe(true)
    expect(after.realTokenReserve).toBe(0n)
    expect(parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'CurveCompleted' })).toHaveLength(1)

    expect(await revertOf(bob, 'buy', [token, 0n, await deadline()], parseEther('1'))).toBe('CurveIsComplete')
    await send(carol, 'approve', [launchpad, 1n], 0n, token, launchTokenAbi as Abi)
    expect(await revertOf(carol, 'sell', [token, 1n, 0n, await deadline()])).toBe('CurveIsComplete')
  })

  it('never lets the creator allocation be sold beyond what buyers put in', async () => {
    const token = await launch(alice, { creatorBps: 1000, curveBps: 7000 })
    await send(bob, 'buy', [token, 0n, await deadline()], parseEther('0.1'))
    const bought = await balanceOf(token, bob)
    await send(alice, 'approve', [launchpad, 2n ** 256n - 1n], 0n, token, launchTokenAbi as Abi)
    expect(await revertOf(alice, 'sell', [token, bought + 1n, 0n, await deadline()])).toBe('ExceedsCurveSold')
    // Selling up to the sold amount is allowed and is paid at curve price, fully backed.
    await send(alice, 'sell', [token, bought, 0n, await deadline()])
    const c = await curveOf(token)
    expect(c.realTokenReserve).toBe(c.curveSupply)
    expect(c.realQuoteReserve).toBeGreaterThanOrEqual(0n)
  })

  it('sellWithPermit sells in one transaction without a prior approval', async () => {
    const token = await launch(alice)
    await send(bob, 'buy', [token, 0n, await deadline()], parseEther('0.3'))
    const amount = (await balanceOf(token, bob)) / 2n
    const d = await deadline()
    const nonce = await read<bigint>('nonces', [bob], token, launchTokenAbi as Abi)
    const sig = await chain.wallet(bob).signTypedData({
      account: bob,
      domain: { name: 'Achilyon Test', version: '1', chainId: 31337, verifyingContract: token },
      types: { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] },
      primaryType: 'Permit',
      message: { owner: bob, spender: launchpad, value: amount, nonce, deadline: d },
    })
    const { r, s, v } = parseSignature(sig)
    const before = await balanceOf(token, bob)
    await send(bob, 'sellWithPermit', [token, amount, 0n, d, d, Number(v), r, s])
    expect(await balanceOf(token, bob)).toBe(before - amount)
    // Without a permit or allowance, selling fails with the token's allowance error.
    expect(await revertOf(carol, 'sell', [token, 1n, 0n, await deadline()])).toMatch(/ExceedsCurveSold|ERC20InsufficientAllowance|ERC20InsufficientBalance/)
  })
})

describe('safety', () => {
  it('blocks re-entrancy from payout callbacks', async () => {
    const token = await launch(alice)
    const attacker = await chain.deploy('ReentrantTrader', [launchpad])
    const abi = artifacts().ReentrantTrader!.abi as Abi
    await send(bob, 'buy', [token], parseEther('0.5'), attacker, abi)
    await send(bob, 'sellAll', [], 0n, attacker, abi)
    expect(await read<boolean>('attempted', [], attacker, abi)).toBe(true)
    expect(await read<boolean>('reentrySucceeded', [], attacker, abi)).toBe(false)
  })

  it('reverts cleanly when a refund cannot be delivered', async () => {
    const token = await launch(alice)
    const noReceive = await chain.deploy('NoReceive')
    const abi = artifacts().NoReceive!.abi as Abi
    await expect(chain.publicClient.simulateContract({ account: bob, address: noReceive, abi, functionName: 'buy', args: [launchpad, token], value: parseEther('100') })).rejects.toThrow(/NativeTransferFailed|reverted/)
  })

  it('pause blocks launches and buys but never sells', async () => {
    const token = await launch(alice)
    await send(bob, 'buy', [token, 0n, await deadline()], parseEther('0.2'))
    await send(bob, 'approve', [launchpad, 2n ** 256n - 1n], 0n, token, launchTokenAbi as Abi)
    expect(await revertOf(alice, 'pause')).toBe('OwnableUnauthorizedAccount')
    await send(owner, 'pause')
    expect(await revertOf(alice, 'createToken', [params(), 0n, await deadline()])).toBe('EnforcedPause')
    expect(await revertOf(bob, 'buy', [token, 0n, await deadline()], parseEther('0.1'))).toBe('EnforcedPause')
    await send(bob, 'sell', [token, (await balanceOf(token, bob)) / 2n, 0n, await deadline()])
    await send(owner, 'unpause')
  })

  it('fees: capped, snapshotted per curve, owner-only, withdrawn to the recipient', async () => {
    expect(await revertOf(owner, 'setFeeBps', [201])).toBe('FeeTooHigh')
    expect(await revertOf(alice, 'setFeeBps', [50])).toBe('OwnableUnauthorizedAccount')
    const oldToken = await launch(alice)
    await send(owner, 'setFeeBps', [50])
    const newToken = await launch(alice)
    expect((await curveOf(oldToken)).feeBps).toBe(100)
    expect((await curveOf(newToken)).feeBps).toBe(50)
    await send(owner, 'setFeeBps', [100])

    const fees = await read<bigint>('accruedFees')
    expect(fees).toBeGreaterThan(0n)
    const before = await chain.publicClient.getBalance({ address: feeRecipient })
    await send(bob, 'withdrawFees') // permissionless; always pays the recipient
    expect(await chain.publicClient.getBalance({ address: feeRecipient })).toBe(before + fees)
    expect(await read<bigint>('accruedFees')).toBe(0n)
    expect(await revertOf(bob, 'withdrawFees')).toBe('ZeroAmount')
  })

  it('migration: permissionless after completion, hands the exact reserves and final price to the fixed migrator once', async () => {
    const token = await launch(alice)
    expect(await revertOf(bob, 'migrate', [token])).toBe('CurveNotComplete')
    await send(carol, 'buy', [token, 0n, await deadline()], parseEther('50'))
    expect(await read<boolean>('isMigrated', [token])).toBe(false)

    const c = await curveOf(token)
    const r = await send(bob, 'migrate', [token]) // not the owner
    const mAbi = artifacts().MockMigrator!.abi as Abi
    expect(await read<bigint>('lastQuoteAmount', [], migrator, mAbi)).toBe(c.realQuoteReserve)
    expect(await read<bigint>('lastTokenAmount', [], migrator, mAbi)).toBe(c.liquidityTokens)
    expect(await read<bigint>('tokenBalanceAtCall', [], migrator, mAbi)).toBe(c.liquidityTokens)
    expect(await read<bigint>('lastVirtualQuote', [], migrator, mAbi)).toBe(c.virtualQuoteReserve)
    expect(await read<bigint>('lastVirtualToken', [], migrator, mAbi)).toBe(c.virtualTokenReserve)
    const pool = await read<Address>('poolFor', [token], migrator, mAbi)
    const [ev] = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: r.logs, eventName: 'Migrated' })
    expect(ev!.args).toMatchObject({ token, pool, quoteAmount: c.realQuoteReserve, tokenAmount: c.liquidityTokens })
    const after = await curveOf(token)
    expect(after).toMatchObject({ migrated: true, realQuoteReserve: 0n, realTokenReserve: 0n, liquidityTokens: 0n })
    expect(await read<boolean>('isMigrated', [token])).toBe(true)
    expect(await revertOf(bob, 'migrate', [token])).toBe('AlreadyMigrated')
    expect(await read<bigint>('pool', [], token, launchTokenAbi as Abi)).toBe(pool)
  })

  it('LaunchToken refuses transfers into its future pool until migration', async () => {
    const token = await launch(alice)
    await send(carol, 'buy', [token, 0n, await deadline()], parseEther('0.5'))
    const pool = await read<Address>('pool', [], token, launchTokenAbi as Abi)
    const tokenErr = async (from: Address, fn: string, args: unknown[]) => {
      try {
        await chain.publicClient.simulateContract({ address: token, abi: launchTokenAbi as Abi, functionName: fn, args, account: from })
        return null
      } catch (e) {
        return (e as BaseError).walk((x) => x instanceof ContractFunctionRevertedError) instanceof ContractFunctionRevertedError
          ? ((e as BaseError).walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError).data?.errorName ?? null
          : null
      }
    }
    expect(await tokenErr(carol, 'transfer', [pool, 1n])).toBe('PoolLocked')
    await chain.wallet(carol).writeContract({ address: token, abi: launchTokenAbi, functionName: 'approve', args: [bob, 10n], account: carol, chain: chain.publicClient.chain })
    expect(await tokenErr(bob, 'transferFrom', [carol, pool, 1n])).toBe('PoolLocked')
    expect(await tokenErr(carol, 'transfer', [bob, 1n])).toBeNull() // ordinary transfers are unaffected
  })

  it('rejects unknown tokens and direct ETH transfers', async () => {
    expect(await revertOf(bob, 'buy', [bob, 0n, await deadline()], 1n)).toBe('UnknownToken')
    await expect(chain.wallet(bob).sendTransaction({ to: launchpad, value: 1n, account: bob })).rejects.toThrow()
  })
})
