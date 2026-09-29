#!/usr/bin/env node
/**
 * Deploys AchilyonLaunchpad + UniswapV2Migrator from the committed artifacts
 * and prints the NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS entry for them.
 *
 *   DEPLOYER_PRIVATE_KEY=0x… RPC_URL=https://… CHAIN=base \
 *     FEE_RECIPIENT=0x… START_MCAP=1.5625 \
 *     DEX_ROUTER=0x… npm run contracts:deploy -- --dry-run
 *
 * DEX_ROUTER is a Uniswap V2 Router02; the factory and wrapped native token
 * are read from it. Alternatively pass DEX_FACTORY and WRAPPED_NATIVE.
 *
 * The migrator is immutable in the launchpad, so its address is predicted
 * from the deployer nonce and its creation is dry-run with eth_call before
 * anything is sent.
 *
 * The private key is read from the environment of this CLI process only — it
 * is never written to disk or used by the web app. Real networks require
 * `--yes`; run with `--dry-run` first.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createPublicClient, createWalletClient, encodeDeployData, getAddress, getContractAddress, http, isAddress, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ARTIFACTS = join(HERE, '..', 'artifacts')
/** Uniswap V2's pair init-code hash (the same on its official deployments; forks such as PancakeSwap differ). */
export const UNISWAP_V2_INIT_CODE_HASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'

/** Chains the app supports, with mainnet ids; testnets are allowed via EVM_CHAIN_ID + testnet flag. */
export const CHAINS = {
  ethereum: { id: 1, explorer: 'https://etherscan.io', usdReference: 3200 },
  base: { id: 8453, explorer: 'https://basescan.org', usdReference: 3200 },
  arbitrum: { id: 42161, explorer: 'https://arbiscan.io', usdReference: 3200 },
  polygon: { id: 137, explorer: 'https://polygonscan.com', usdReference: 0.45 },
  bsc: { id: 56, explorer: 'https://bscscan.com', usdReference: 590 },
  avalanche: { id: 43114, explorer: 'https://snowtrace.io', usdReference: 28 },
}
const LOCAL_CHAIN_IDS = new Set([31337, 1337])

export class DeployConfigError extends Error {}

/** Validates raw env/flags into a deploy config. Pure — no network access. */
export function parseConfig(env, argv = []) {
  const flags = new Set(argv)
  const chain = env.CHAIN
  if (!chain || !(chain in CHAINS)) throw new DeployConfigError(`CHAIN must be one of: ${Object.keys(CHAINS).join(', ')}`)
  const key = env.DEPLOYER_PRIVATE_KEY
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new DeployConfigError('DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key (set it in your shell, never in a committed file)')
  if (!env.RPC_URL) throw new DeployConfigError('RPC_URL is required')
  const account = privateKeyToAccount(key)
  const owner = env.OWNER ? checkedAddress(env.OWNER, 'OWNER') : account.address
  const feeRecipient = env.FEE_RECIPIENT ? checkedAddress(env.FEE_RECIPIENT, 'FEE_RECIPIENT') : owner
  const feeBps = env.FEE_BPS === undefined ? 100 : Number(env.FEE_BPS)
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 200) throw new DeployConfigError('FEE_BPS must be an integer between 0 and 200')
  if (!env.START_MCAP) throw new DeployConfigError(`START_MCAP (starting market cap in native units) is required — e.g. ${(5000 / CHAINS[chain].usdReference).toPrecision(4)} for ≈ $5K at the reference price`)
  let startMarketCapQuote
  try {
    startMarketCapQuote = parseEther(env.START_MCAP)
  } catch {
    throw new DeployConfigError('START_MCAP must be a decimal number')
  }
  if (startMarketCapQuote <= 0n) throw new DeployConfigError('START_MCAP must be greater than zero')
  const dexRouter = env.DEX_ROUTER ? checkedAddress(env.DEX_ROUTER, 'DEX_ROUTER') : undefined
  if (!dexRouter && (!env.DEX_FACTORY || !env.WRAPPED_NATIVE)) throw new DeployConfigError('Set DEX_ROUTER (a Uniswap V2 Router02), or both DEX_FACTORY and WRAPPED_NATIVE')
  const dexFactory = env.DEX_FACTORY ? checkedAddress(env.DEX_FACTORY, 'DEX_FACTORY') : undefined
  const wrappedNative = env.WRAPPED_NATIVE ? checkedAddress(env.WRAPPED_NATIVE, 'WRAPPED_NATIVE') : undefined
  const pairInitCodeHash = env.PAIR_INIT_CODE_HASH ?? UNISWAP_V2_INIT_CODE_HASH
  if (!/^0x[0-9a-fA-F]{64}$/.test(pairInitCodeHash)) throw new DeployConfigError('PAIR_INIT_CODE_HASH must be a 32-byte hex value')
  const dexName = (env.DEX_NAME ?? 'Uniswap V2').trim()
  if (!dexName || dexName.length > 32) throw new DeployConfigError('DEX_NAME must be 1–32 characters')
  const testnet = env.TESTNET === 'true' || env.TESTNET === '1'
  const evmChainId = env.EVM_CHAIN_ID ? Number(env.EVM_CHAIN_ID) : CHAINS[chain].id
  if (!Number.isInteger(evmChainId) || evmChainId <= 0) throw new DeployConfigError('EVM_CHAIN_ID must be a positive integer')
  if (evmChainId !== CHAINS[chain].id && !testnet && !LOCAL_CHAIN_IDS.has(evmChainId)) throw new DeployConfigError(`EVM_CHAIN_ID ${evmChainId} is not ${chain} mainnet (${CHAINS[chain].id}) — set TESTNET=true for a testnet`)
  return {
    chain, account, owner, feeRecipient, feeBps, startMarketCapQuote, evmChainId, testnet, dexRouter, dexFactory, wrappedNative, pairInitCodeHash, dexName,
    rpcUrl: env.RPC_URL, explorerUrl: env.EXPLORER_URL ?? (testnet ? undefined : CHAINS[chain].explorer),
    dryRun: flags.has('--dry-run'), yes: flags.has('--yes'),
  }
}

function checkedAddress(value, name) {
  if (!isAddress(value)) throw new DeployConfigError(`${name} is not a valid address`)
  const a = getAddress(value)
  if (a === '0x0000000000000000000000000000000000000000') throw new DeployConfigError(`${name} cannot be the zero address`)
  return a
}

export function loadArtifact(name = 'AchilyonLaunchpad') {
  const a = JSON.parse(readFileSync(join(ARTIFACTS, `${name}.json`), 'utf8'))
  if (!Array.isArray(a.abi) || typeof a.bytecode !== 'string' || !a.bytecode.startsWith('0x')) throw new Error(`${name} artifact is invalid — run npm run contracts:build`)
  return a
}

/**
 * Deploys with the given transport. Returns the deployment entry for
 * NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS. Throws if the RPC chain id does not match.
 */
export async function deployLaunchpad(config, transport, log = () => {}) {
  const artifact = loadArtifact()
  const migratorArtifact = loadArtifact('UniswapV2Migrator')
  const publicClient = createPublicClient({ transport })
  const rpcChainId = await publicClient.getChainId()
  if (rpcChainId !== config.evmChainId) throw new DeployConfigError(`RPC reports chain id ${rpcChainId}, expected ${config.evmChainId}`)
  if (!LOCAL_CHAIN_IDS.has(rpcChainId) && !config.yes && !config.dryRun) throw new DeployConfigError('Refusing to deploy to a real network without --yes (run with --dry-run first)')

  if (config.dexRouter) {
    const code = await publicClient.getCode({ address: config.dexRouter })
    if (!code || code === '0x') throw new DeployConfigError(`DEX_ROUTER ${config.dexRouter} has no contract code on this network`)
    const routerAbi = ['factory', 'WETH'].map((name) => ({ type: 'function', name, stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }))
    const [f, w] = await Promise.all(['factory', 'WETH'].map((functionName) => publicClient.readContract({ address: config.dexRouter, abi: routerAbi, functionName })))
    if (config.dexFactory && getAddress(f) !== config.dexFactory) throw new DeployConfigError(`DEX_FACTORY does not match the router's factory (${f})`)
    if (config.wrappedNative && getAddress(w) !== config.wrappedNative) throw new DeployConfigError(`WRAPPED_NATIVE does not match the router's WETH (${w})`)
    config = { ...config, dexFactory: getAddress(f), wrappedNative: getAddress(w) }
  }
  for (const [label, address] of [['DEX_FACTORY', config.dexFactory], ['WRAPPED_NATIVE', config.wrappedNative]]) {
    const code = await publicClient.getCode({ address })
    if (!code || code === '0x') throw new DeployConfigError(`${label} ${address} has no contract code on this network`)
  }

  const balance = await publicClient.getBalance({ address: config.account.address })
  const nonce = await publicClient.getTransactionCount({ address: config.account.address, blockTag: 'pending' })
  const launchpadAddress = getContractAddress({ from: config.account.address, nonce: BigInt(nonce) })
  const migratorAddress = getContractAddress({ from: config.account.address, nonce: BigInt(nonce + 1) })
  const args = [config.owner, config.feeRecipient, config.startMarketCapQuote, config.feeBps, migratorAddress]
  const migratorArgs = [launchpadAddress, config.dexFactory, config.wrappedNative, config.pairInitCodeHash]

  // The migrator constructor checks the init-code hash against an existing
  // pair; dry-run it first so a bad config can't strand a launchpad.
  try {
    await publicClient.call({ account: config.account.address, data: encodeDeployData({ abi: migratorArtifact.abi, bytecode: migratorArtifact.bytecode, args: migratorArgs }) })
  } catch (e) {
    throw new DeployConfigError(`Migrator deployment would fail (wrong PAIR_INIT_CODE_HASH for this factory?): ${e?.shortMessage ?? e?.message ?? e}`)
  }
  const pairCount = await publicClient.readContract({ address: config.dexFactory, abi: [{ type: 'function', name: 'allPairsLength', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }], functionName: 'allPairsLength' }).catch(() => null)
  log(`Network       ${config.chain}${config.testnet ? ' (testnet)' : ''} · chain id ${rpcChainId}`)
  log(`Deployer      ${config.account.address} · balance ${formatEther(balance)}`)
  log(`Owner         ${config.owner}`)
  log(`Fee recipient ${config.feeRecipient} · fee ${config.feeBps / 100}%`)
  log(`Start mcap    ${formatEther(config.startMarketCapQuote)} (native)`)
  log(`DEX           ${config.dexName} · factory ${config.dexFactory} · wrapped native ${config.wrappedNative}`)
  log(`Init hash     ${config.pairInitCodeHash} ${pairCount && pairCount > 0n ? '(verified against an existing pair)' : '(NOT verifiable: factory has no pairs yet — make sure it is right)'}`)
  log(`Addresses     launchpad ${launchpadAddress} · migrator ${migratorAddress} (nonces ${nonce}, ${nonce + 1})`)
  log(`Bytecode      ${(artifact.bytecode.length - 2) / 2} bytes (${artifact.compiler})`)
  if (config.dryRun) {
    log('Dry run — nothing was sent.')
    return null
  }
  if (balance === 0n) throw new DeployConfigError('Deployer has no balance for gas')

  const wallet = createWalletClient({ account: config.account, transport })
  const chain = { id: rpcChainId, name: config.chain, nativeCurrency: { name: 'native', symbol: 'NATIVE', decimals: 18 }, rpcUrls: { default: { http: [] } } }
  const deployOne = async (label, abi, bytecode, ctorArgs, n, expected) => {
    const hash = await wallet.deployContract({ abi, bytecode, args: ctorArgs, chain, nonce: n })
    log(`Submitted     ${label} ${hash}`)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error(`${label} deployment reverted in ${hash}`)
    if (getAddress(receipt.contractAddress) !== expected) throw new Error(`${label} deployed at ${receipt.contractAddress}, expected ${expected} (was the nonce used concurrently?)`)
    return { hash, receipt }
  }
  const lp = await deployOne('launchpad', artifact.abi, artifact.bytecode, args, nonce, launchpadAddress)
  const mg = await deployOne('migrator', migratorArtifact.abi, migratorArtifact.bytecode, migratorArgs, nonce + 1, migratorAddress)
  const entry = {
    address: launchpadAddress, evmChainId: rpcChainId, startBlock: Number(lp.receipt.blockNumber), testnet: config.testnet,
    dexName: config.dexName, ...(config.explorerUrl ? { explorerUrl: config.explorerUrl } : {}),
  }
  log(`Deployed      launchpad ${launchpadAddress} at block ${lp.receipt.blockNumber}; migrator ${migratorAddress}`)
  return { hash: lp.hash, migratorHash: mg.hash, migrator: migratorAddress, entry }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''))
    return
  }
  const config = parseConfig(process.env, argv)
  const res = await deployLaunchpad(config, http(config.rpcUrl, { timeout: 60_000 }), (m) => console.log(m))
  if (!res) return
  console.log('\nAdd to NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS (merge with existing entries):')
  console.log(JSON.stringify({ [config.chain]: res.entry }))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`\n✖ ${e instanceof DeployConfigError ? e.message : e?.shortMessage ?? e?.message ?? e}`)
    process.exit(1)
  })
}
