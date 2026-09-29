import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BaseError, ContractFunctionRevertedError, keccak256, parseEther, parseEventLogs, type Abi, type Address, type Hex } from 'viem'
import factoryArtifact from '@uniswap/v2-core/build/UniswapV2Factory.json'
import pairArtifact from '@uniswap/v2-core/build/UniswapV2Pair.json'
import { achilyonLaunchpadAbi, launchTokenAbi, uniswapV2MigratorAbi } from './abi'
import { launchpadAbiWithErrors } from './launchpad'
import { artifacts, deployWithUniswap, startChain, type TestChain } from '@/test/evm'

/**
 * Graduation into a real Uniswap V2 pool. The factory and pair are the
 * official @uniswap/v2-core build artifacts — their init-code hash is the
 * mainnet one (0x96e8ac42…), so this exercises the same bytecode as production.
 */

const hex = (b: string) => `0x${b.replace(/^0x/, '')}` as Hex
const FACTORY_ABI = factoryArtifact.abi as Abi
const PAIR_ABI = pairArtifact.abi as Abi
const PAIR_INIT_CODE_HASH = keccak256(hex(pairArtifact.bytecode))
const DEAD = '0x000000000000000000000000000000000000dEaD'
const ZERO = '0x0000000000000000000000000000000000000000'
const SUPPLY = parseEther('1000000000')

let chain: TestChain
let deployer: Address, alice: Address, bob: Address, carol: Address, mallory: Address
let factory: Address, weth: Address, launchpad: Address, migrator: Address

const read = <T>(address: Address, abi: Abi, functionName: string, args: readonly unknown[] = []) =>
  chain.publicClient.readContract({ address, abi, functionName, args }) as Promise<T>

async function send(from: Address, address: Address, abi: Abi, functionName: string, args: readonly unknown[] = [], value = 0n) {
  const { request } = await chain.publicClient.simulateContract({ account: from, address, abi, functionName, args, value })
  const hash = await chain.wallet(from).writeContract(request as never)
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  expect(receipt.status).toBe('success')
  return receipt
}

async function revertOf(from: Address, address: Address, abi: Abi, functionName: string, args: readonly unknown[] = [], value = 0n) {
  try {
    await chain.publicClient.simulateContract({ account: from, address, abi, functionName, args, value })
    return null
  } catch (e) {
    const r = (e as BaseError).walk((x) => x instanceof ContractFunctionRevertedError)
    return r instanceof ContractFunctionRevertedError ? (r.data?.errorName ?? r.reason ?? 'reverted') : 'reverted'
  }
}

const deadline = async () => (await chain.now()) + 600n
const lp = (fn: string, args: readonly unknown[] = [], value = 0n, from = alice) => send(from, launchpad, launchpadAbiWithErrors as Abi, fn, args, value)

async function launch(curveBps = 8000, creatorBps = 0) {
  const r = await lp('createToken', [{ name: 'Graduate', symbol: 'GRAD', metadataURI: '', totalSupply: SUPPLY, curveBps, creatorBps }, 0n, await deadline()])
  return parseEventLogs({ abi: achilyonLaunchpadAbi, logs: r.logs, eventName: 'TokenCreated' })[0]!.args.token
}
type Curve = { complete: boolean; migrated: boolean; virtualTokenReserve: bigint; virtualQuoteReserve: bigint; realQuoteReserve: bigint; liquidityTokens: bigint }
const curveOf = (token: Address) => read<Curve>(launchpad, achilyonLaunchpadAbi as Abi, 'getCurve', [token])
const balanceOf = (token: Address, who: Address) => read<bigint>(token, launchTokenAbi as Abi, 'balanceOf', [who])

async function reservesOf(pool: Address, token: Address) {
  const [r0, r1] = await read<[bigint, bigint, number]>(pool, PAIR_ABI, 'getReserves')
  const token0 = await read<Address>(pool, PAIR_ABI, 'token0')
  return token0.toLowerCase() === token.toLowerCase() ? { tokens: r0, quote: r1 } : { tokens: r1, quote: r0 }
}

/** Deploys launchpad + migrator with the migrator address predicted, as the deploy script does. */
async function deployPair() {
  const d = await deployWithUniswap(chain, { factory, weth })
  return { lpAddr: d.address, mAddr: d.migrator }
}

beforeAll(async () => {
  chain = await startChain()
  ;[deployer, alice, bob, carol, mallory] = chain.accounts as [Address, Address, Address, Address, Address]
  factory = await chain.deployBytecode(FACTORY_ABI, hex(factoryArtifact.bytecode), [deployer])
  weth = await chain.deploy('TestWETH')
  ;({ lpAddr: launchpad, mAddr: migrator } = await deployPair())
})
afterAll(() => chain?.close())

describe('UniswapV2Migrator', () => {
  it('is wired immutably and predicts pool addresses exactly as the factory creates them', async () => {
    expect(await read(launchpad, achilyonLaunchpadAbi as Abi, 'migrator')).toBe(migrator)
    expect(await read(migrator, uniswapV2MigratorAbi as Abi, 'launchpad')).toBe(launchpad)
    const token = await launch()
    const predicted = await read<Address>(migrator, uniswapV2MigratorAbi as Abi, 'poolFor', [token])
    expect(await read(token, launchTokenAbi as Abi, 'pool')).toBe(predicted)
    await send(mallory, factory, FACTORY_ABI, 'createPair', [token, weth]) // anyone may create the empty pair
    expect(await read(factory, FACTORY_ABI, 'getPair', [token, weth])).toBe(predicted)
  })

  it('verifies the init-code hash against an existing pair at deployment', async () => {
    const wrong = keccak256('0x1234')
    await expect(chain.deploy('UniswapV2Migrator', [launchpad, factory, weth, wrong])).rejects.toThrow()
    await expect(chain.deploy('UniswapV2Migrator', [ZERO, factory, weth, PAIR_INIT_CODE_HASH])).rejects.toThrow()
    // A fresh factory has no pair to check against; the deploy script must then be given the right hash.
    const fresh = await chain.deployBytecode(FACTORY_ABI, hex(factoryArtifact.bytecode), [deployer])
    await expect(chain.deploy('UniswapV2Migrator', [launchpad, fresh, weth, wrong])).resolves.toMatch(/^0x/)
  })

  it('only the launchpad can call migrate', async () => {
    expect(await revertOf(mallory, migrator, uniswapV2MigratorAbi as Abi, 'migrate', [weth, 1n, 1n, 1n], 1n)).toBe('OnlyLaunchpad')
  })

  it('graduates a default curve: all reserves into the pool, LP burned, price never below the curve', async () => {
    const token = await launch(8000, 0)
    await lp('buy', [token, 0n, await deadline()], parseEther('10'), carol) // completes and refunds the excess
    const c = await curveOf(token)
    expect(c.complete).toBe(true)
    const finalCurvePrice = Number(c.virtualQuoteReserve) / Number(c.virtualTokenReserve)

    const r = await lp('migrate', [token], 0n, bob) // permissionless
    const pool = await read<Address>(factory, FACTORY_ABI, 'getPair', [token, weth])
    const [seeded] = parseEventLogs({ abi: uniswapV2MigratorAbi, logs: r.logs, eventName: 'PoolSeeded' })
    const res = await reservesOf(pool, token)
    expect(res.quote).toBe(c.realQuoteReserve)
    // 80/20 needs ≈20.7% for price continuity; only 20% exists, so all of it is used and the pool opens slightly higher.
    expect(res.tokens).toBe(c.liquidityTokens)
    expect(seeded!.args.tokensBurned).toBe(0n)
    const poolPrice = Number(res.quote) / Number(res.tokens)
    expect(poolPrice).toBeGreaterThanOrEqual(finalCurvePrice)
    expect(poolPrice / finalCurvePrice).toBeLessThan(1.04)

    const supply = await read<bigint>(pool, PAIR_ABI, 'totalSupply')
    expect(await read<bigint>(pool, PAIR_ABI, 'balanceOf', [DEAD])).toBe(supply - 1000n) // all LP burned (1000 is Uniswap's locked minimum)
    expect(seeded!.args.liquidityBurned).toBe(supply - 1000n)
    // Nothing is left behind anywhere.
    expect(await balanceOf(token, launchpad)).toBe(0n)
    expect(await balanceOf(token, migrator)).toBe(0n)
    expect(await read<bigint>(weth, artifacts().TestWETH!.abi as Abi, 'balanceOf', [migrator])).toBe(0n)
    expect(await chain.publicClient.getBalance({ address: migrator })).toBe(0n)
  })

  it('burns surplus liquidity tokens so a 50% curve opens exactly at its final price', async () => {
    const token = await launch(5000, 0)
    await lp('buy', [token, 0n, await deadline()], parseEther('10'), carol)
    const c = await curveOf(token)
    await lp('migrate', [token], 0n, bob)
    const pool = await read<Address>(factory, FACTORY_ABI, 'getPair', [token, weth])
    const res = await reservesOf(pool, token)
    const expectedTokens = (c.realQuoteReserve * c.virtualTokenReserve) / c.virtualQuoteReserve
    expect(res.tokens).toBe(expectedTokens)
    expect(await balanceOf(token, DEAD)).toBe(c.liquidityTokens - expectedTokens)
    const drift = Number(res.quote) / Number(res.tokens) / (Number(c.virtualQuoteReserve) / Number(c.virtualTokenReserve)) - 1
    expect(Math.abs(drift)).toBeLessThan(1e-12)
  })

  it('defeats pool pre-seeding and the donate-and-sync DoS', async () => {
    const token = await launch()
    await lp('buy', [token, 0n, await deadline()], parseEther('0.5'), mallory)
    const pool = await read<Address>(token, launchTokenAbi as Abi, 'pool')
    await send(mallory, factory, FACTORY_ABI, 'createPair', [token, weth])

    // Can't put tokens into the pool (directly or via transferFrom), so no early liquidity at a skewed price.
    expect(await revertOf(mallory, token, launchTokenAbi as Abi, 'transfer', [pool, 1n])).toBe('PoolLocked')
    await send(mallory, token, launchTokenAbi as Abi, 'approve', [carol, 10n])
    expect(await revertOf(carol, token, launchTokenAbi as Abi, 'transferFrom', [mallory, pool, 1n])).toBe('PoolLocked')

    // Dust WETH + sync() would make Uniswap's router revert forever; the migrator mints directly instead.
    const wethAbi = artifacts().TestWETH!.abi as Abi
    await send(mallory, weth, wethAbi, 'deposit', [], 1000n)
    await send(mallory, weth, wethAbi, 'transfer', [pool, 1000n])
    await send(mallory, pool, PAIR_ABI, 'sync')
    expect((await reservesOf(pool, token)).quote).toBe(1000n)

    await lp('buy', [token, 0n, await deadline()], parseEther('10'), carol)
    await lp('migrate', [token], 0n, bob)
    const supply = await read<bigint>(pool, PAIR_ABI, 'totalSupply')
    expect(await read<bigint>(pool, PAIR_ABI, 'balanceOf', [mallory])).toBe(0n)
    expect(await read<bigint>(pool, PAIR_ABI, 'balanceOf', [DEAD])).toBe(supply - 1000n)
  })

  it('is a normal ERC-20 after graduation: the pool trades with x·y=k', async () => {
    const token = await launch()
    await lp('buy', [token, 0n, await deadline()], parseEther('10'), carol)
    await lp('migrate', [token], 0n, bob)
    const pool = await read<Address>(token, launchTokenAbi as Abi, 'pool')
    const before = await reservesOf(pool, token)

    // Sell 1M tokens straight into the pair (the lock is gone), as a router would.
    const amountIn = parseEther('1000000')
    await send(carol, token, launchTokenAbi as Abi, 'transfer', [pool, amountIn])
    const inWithFee = amountIn * 997n
    const out = (inWithFee * before.quote) / (before.tokens * 1000n + inWithFee)
    const token0 = await read<Address>(pool, PAIR_ABI, 'token0')
    const args = token0.toLowerCase() === token.toLowerCase() ? [0n, out, carol, '0x'] : [out, 0n, carol, '0x']
    const wethAbi = artifacts().TestWETH!.abi as Abi
    const wethBefore = await read<bigint>(weth, wethAbi, 'balanceOf', [carol])
    await send(carol, pool, PAIR_ABI, 'swap', args)
    expect(await read<bigint>(weth, wethAbi, 'balanceOf', [carol])).toBe(wethBefore + out)
  })
})
