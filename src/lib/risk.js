import { toNumber } from './utils.js'

/**
 * Contract & market risk engine.
 * Combines on-chain security flags (GoPlus) with DexScreener market structure.
 * Each check yields { id, label, status: 'pass' | 'warn' | 'fail' | 'info', detail, weight }.
 * The score starts at 100 and deducts `weight` for fails and half of it for warnings.
 */

const flag = (v) => v === '1' || v === 1 || v === true
const pct = (v) => toNumber(v) * 100

function check(id, label, status, detail, weight = 0) {
  return { id, label, status, detail, weight }
}

export function evmSecurityChecks(sec) {
  if (!sec) return []
  const checks = []
  const buyTax = pct(sec.buy_tax)
  const sellTax = pct(sec.sell_tax)

  checks.push(flag(sec.is_honeypot)
    ? check('honeypot', 'Honeypot', 'fail', 'Simulation indicates tokens cannot be sold.', 60)
    : check('honeypot', 'Honeypot', 'pass', 'Sell simulation succeeded.'))
  if (flag(sec.cannot_sell_all)) checks.push(check('sell-all', 'Sell restrictions', 'fail', 'Holders cannot sell their full balance.', 25))

  const maxTax = Math.max(buyTax, sellTax)
  checks.push(check('tax', 'Buy / sell tax', maxTax > 10 ? 'fail' : maxTax > 5 ? 'warn' : 'pass',
    `${buyTax.toFixed(1)}% buy · ${sellTax.toFixed(1)}% sell`, maxTax > 10 ? 20 : 8))

  checks.push(flag(sec.is_open_source)
    ? check('verified', 'Source verified', 'pass', 'Contract source code is public.')
    : check('verified', 'Source verified', 'fail', 'Contract source is not verified — logic cannot be audited.', 20))

  if (flag(sec.is_proxy)) checks.push(check('proxy', 'Upgradeable proxy', 'warn', 'Logic can be swapped by the proxy admin.', 10))
  checks.push(flag(sec.is_mintable)
    ? check('mint', 'Mint function', 'warn', 'Supply can be increased by a privileged account.', 12)
    : check('mint', 'Mint function', 'pass', 'No mint function detected.'))

  const owner = sec.owner_address
  const renounced = !owner || /^0x0{40}$/i.test(owner) || /^0x0{36}dead$/i.test(owner)
  checks.push(renounced
    ? check('owner', 'Ownership', 'pass', 'Ownership renounced or no owner.')
    : check('owner', 'Ownership', 'warn', `Owned by ${owner.slice(0, 8)}…`, 6))

  if (flag(sec.hidden_owner)) checks.push(check('hidden-owner', 'Hidden owner', 'fail', 'A hidden owner can retain control.', 20))
  if (flag(sec.can_take_back_ownership)) checks.push(check('reclaim', 'Reclaimable ownership', 'fail', 'Ownership can be reclaimed after renouncing.', 20))
  if (flag(sec.selfdestruct)) checks.push(check('selfdestruct', 'Self-destruct', 'fail', 'Contract can self-destruct.', 20))
  if (flag(sec.transfer_pausable)) checks.push(check('pausable', 'Pausable transfers', 'warn', 'Trading can be paused by the owner.', 10))
  if (flag(sec.is_blacklisted)) checks.push(check('blacklist', 'Blacklist', 'warn', 'Addresses can be blacklisted from trading.', 10))
  if (flag(sec.slippage_modifiable)) checks.push(check('tax-mod', 'Modifiable tax', 'warn', 'Owner can change trading taxes.', 10))
  if (flag(sec.trading_cooldown)) checks.push(check('cooldown', 'Trading cooldown', 'info', 'Cooldown between trades is enforced.'))
  if (flag(sec.external_call)) checks.push(check('external', 'External calls', 'warn', 'Contract calls external contracts.', 5))

  const lpLocked = (sec.lp_holders ?? []).filter(h => flag(h.is_locked)).reduce((s, h) => s + pct(h.percent), 0)
  if (sec.lp_holders?.length) {
    checks.push(check('lp-lock', 'Liquidity locked', lpLocked >= 80 ? 'pass' : lpLocked >= 30 ? 'warn' : 'fail',
      `${lpLocked.toFixed(1)}% of LP tokens locked or burned`, lpLocked >= 30 ? 8 : 18))
  }

  const top10 = (sec.holders ?? []).filter(h => !flag(h.is_locked) && !flag(h.is_contract)).slice(0, 10).reduce((s, h) => s + pct(h.percent), 0)
  if (sec.holders?.length) {
    checks.push(check('holders', 'Top-10 concentration', top10 > 50 ? 'fail' : top10 > 30 ? 'warn' : 'pass',
      `${top10.toFixed(1)}% held by top 10 wallets (${toNumber(sec.holder_count).toLocaleString()} holders)`, top10 > 50 ? 15 : 7))
  }
  return checks
}

export function solanaSecurityChecks(sec) {
  if (!sec) return []
  const status = (v) => flag(v?.status ?? v)
  const checks = []
  checks.push(status(sec.mintable)
    ? check('mint', 'Mint authority', 'warn', 'Mint authority is active — supply can grow.', 15)
    : check('mint', 'Mint authority', 'pass', 'Mint authority revoked.'))
  checks.push(status(sec.freezable)
    ? check('freeze', 'Freeze authority', 'fail', 'Token accounts can be frozen by the authority.', 20)
    : check('freeze', 'Freeze authority', 'pass', 'Freeze authority revoked.'))
  if (status(sec.closable)) checks.push(check('closable', 'Closable', 'fail', 'Token program can be closed.', 20))
  if (status(sec.balance_mutable_authority)) checks.push(check('balance', 'Mutable balances', 'fail', 'An authority can modify balances.', 30))
  if (status(sec.non_transferable)) checks.push(check('transfer', 'Non-transferable', 'fail', 'Tokens cannot be transferred.', 40))
  if (status(sec.metadata_mutable)) checks.push(check('metadata', 'Mutable metadata', 'info', 'Name / image can still be changed.'))
  const fee = sec.transfer_fee && Object.keys(sec.transfer_fee).length ? toNumber(sec.transfer_fee.current_fee_rate?.fee_rate) : 0
  if (fee > 0) checks.push(check('fee', 'Transfer fee', fee > 5 ? 'fail' : 'warn', `${fee}% fee on transfers`, 10))
  const top10 = (sec.holders ?? []).slice(0, 10).reduce((s, h) => s + pct(h.percent), 0)
  if (sec.holders?.length) {
    checks.push(check('holders', 'Top-10 concentration', top10 > 50 ? 'fail' : top10 > 30 ? 'warn' : 'pass',
      `${top10.toFixed(1)}% held by top 10 accounts`, top10 > 50 ? 15 : 7))
  }
  return checks
}

export function marketChecks(pairs, now = Date.now()) {
  if (!pairs?.length) return [check('pairs', 'Trading pairs', 'fail', 'No DEX pairs found for this address.', 40)]
  const main = [...pairs].sort((a, b) => toNumber(b.liquidity?.usd) - toNumber(a.liquidity?.usd))[0]
  const liq = pairs.reduce((s, p) => s + toNumber(p.liquidity?.usd), 0)
  const fdv = toNumber(main.fdv)
  const vol = toNumber(main.volume?.h24)
  const buys = toNumber(main.txns?.h24?.buys)
  const sells = toNumber(main.txns?.h24?.sells)
  const ageDays = main.pairCreatedAt ? (now - main.pairCreatedAt) / 86_400_000 : null
  const checks = []

  checks.push(check('liquidity', 'Total liquidity', liq < 10_000 ? 'fail' : liq < 100_000 ? 'warn' : 'pass',
    `$${Math.round(liq).toLocaleString()} across ${pairs.length} pool${pairs.length === 1 ? '' : 's'}`, liq < 10_000 ? 25 : 10))

  if (ageDays !== null) {
    checks.push(check('age', 'Pool age', ageDays < 1 ? 'warn' : 'pass',
      ageDays < 1 ? `Created ${Math.round(ageDays * 24)}h ago — very new` : `Created ${Math.floor(ageDays)} days ago`, 10))
  }
  if (fdv > 0 && liq > 0) {
    const ratio = fdv / liq
    checks.push(check('fdv-liq', 'FDV / liquidity', ratio > 50 ? 'fail' : ratio > 15 ? 'warn' : 'pass',
      `${ratio.toFixed(1)}× — ${ratio > 15 ? 'thin liquidity relative to valuation' : 'healthy depth'}`, ratio > 50 ? 15 : 7))
  }
  if (liq > 0) {
    const turnover = vol / liq
    checks.push(check('turnover', 'Volume / liquidity (24h)', turnover > 25 ? 'warn' : 'pass',
      `${turnover.toFixed(1)}× ${turnover > 25 ? '— possible wash trading' : ''}`.trim(), 6))
  }
  if (buys + sells > 20) {
    const sellRatio = sells / (buys + sells)
    checks.push(check('flow', 'Order flow (24h)', sellRatio > 0.65 ? 'warn' : 'pass',
      `${buys.toLocaleString()} buys · ${sells.toLocaleString()} sells`, 6))
  } else {
    checks.push(check('flow', 'Order flow (24h)', 'warn', 'Very few trades in the last 24h.', 6))
  }
  const hasSocials = Boolean(main.info?.websites?.length || main.info?.socials?.length)
  checks.push(check('socials', 'Project links', hasSocials ? 'pass' : 'warn',
    hasSocials ? 'Website or socials listed on DexScreener.' : 'No website or socials listed.', 5))
  return checks
}

export function scoreChecks(checks) {
  const deduction = checks.reduce((s, c) => s + (c.status === 'fail' ? c.weight : c.status === 'warn' ? c.weight / 2 : 0), 0)
  const score = Math.max(0, Math.min(100, Math.round(100 - deduction)))
  const hardFail = checks.some(c => ['honeypot', 'balance', 'transfer'].includes(c.id) && c.status === 'fail')
  const finalScore = hardFail ? Math.min(score, 10) : score
  const grade = finalScore >= 80 ? 'Low risk' : finalScore >= 60 ? 'Moderate risk' : finalScore >= 35 ? 'High risk' : 'Critical risk'
  const tone = finalScore >= 80 ? 'good' : finalScore >= 60 ? 'ok' : finalScore >= 35 ? 'bad' : 'critical'
  return { score: finalScore, grade, tone }
}

export function detectAddressKind(address) {
  const a = address.trim()
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return 'evm'
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return 'solana'
  return null
}
