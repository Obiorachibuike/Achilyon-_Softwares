import { toNumber } from '@/lib/format'

/**
 * Contract security engine (ported from the original Achilyon analyzer).
 * Converts a GoPlus token-security record into weighted checks and a 0–100
 * score. The score starts at 100 and deducts `weight` for fails and half of it
 * for warnings. It is a heuristic — never a guarantee of safety.
 */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SecurityCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  weight: number
}

export interface SecurityScore {
  score: number
  grade: string
  tone: 'good' | 'ok' | 'bad' | 'critical'
}

export type GoPlusRecord = Record<string, unknown>

type HolderRow = { percent?: unknown; is_locked?: unknown; is_contract?: unknown }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
const flag = (v: unknown) => v === '1' || v === 1 || v === true
const pct = (v: unknown) => toNumber(str(v)) * 100
const list = (v: unknown): HolderRow[] => (Array.isArray(v) ? v.filter(isRecord) : [])

function transferFee(v: unknown): number {
  if (!isRecord(v) || !Object.keys(v).length) return 0
  const rate = v.current_fee_rate
  return isRecord(rate) ? toNumber(str(rate.fee_rate)) : 0
}

function check(id: string, label: string, status: CheckStatus, detail: string, weight = 0): SecurityCheck {
  return { id, label, status, detail, weight }
}

export function evmSecurityChecks(sec: GoPlusRecord | null): SecurityCheck[] {
  if (!sec) return []
  const checks: SecurityCheck[] = []
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

  const owner = typeof sec.owner_address === 'string' ? sec.owner_address : ''
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

  const lpLocked = list(sec.lp_holders).filter(h => flag(h.is_locked)).reduce((s, h) => s + pct(h.percent), 0)
  if (list(sec.lp_holders).length) {
    checks.push(check('lp-lock', 'Liquidity locked', lpLocked >= 80 ? 'pass' : lpLocked >= 30 ? 'warn' : 'fail',
      `${lpLocked.toFixed(1)}% of LP tokens locked or burned`, lpLocked >= 30 ? 8 : 18))
  }

  const top10 = list(sec.holders).filter(h => !flag(h.is_locked) && !flag(h.is_contract)).slice(0, 10).reduce((s, h) => s + pct(h.percent), 0)
  if (list(sec.holders).length) {
    checks.push(check('holders', 'Top-10 concentration', top10 > 50 ? 'fail' : top10 > 30 ? 'warn' : 'pass',
      `${top10.toFixed(1)}% held by top 10 wallets (${toNumber(str(sec.holder_count)).toLocaleString()} holders)`, top10 > 50 ? 15 : 7))
  }
  return checks
}

export function solanaSecurityChecks(sec: GoPlusRecord | null): SecurityCheck[] {
  if (!sec) return []
  const status = (v: unknown) => flag(isRecord(v) ? v.status : v)
  const checks: SecurityCheck[] = []
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
  const fee = transferFee(sec.transfer_fee)
  if (fee > 0) checks.push(check('fee', 'Transfer fee', fee > 5 ? 'fail' : 'warn', `${fee}% fee on transfers`, 10))
  const top10 = list(sec.holders).slice(0, 10).reduce((s, h) => s + pct(h.percent), 0)
  if (list(sec.holders).length) {
    checks.push(check('holders', 'Top-10 concentration', top10 > 50 ? 'fail' : top10 > 30 ? 'warn' : 'pass',
      `${top10.toFixed(1)}% held by top 10 accounts`, top10 > 50 ? 15 : 7))
  }
  return checks
}

export function scoreChecks(checks: SecurityCheck[]): SecurityScore {
  const deduction = checks.reduce((s, c) => s + (c.status === 'fail' ? c.weight : c.status === 'warn' ? c.weight / 2 : 0), 0)
  const score = Math.max(0, Math.min(100, Math.round(100 - deduction)))
  const hardFail = checks.some(c => ['honeypot', 'balance', 'transfer'].includes(c.id) && c.status === 'fail')
  const finalScore = hardFail ? Math.min(score, 10) : score
  const grade: string = finalScore >= 80 ? 'Low risk' : finalScore >= 60 ? 'Moderate risk' : finalScore >= 35 ? 'High risk' : 'Critical risk'
  const tone: SecurityScore['tone'] = finalScore >= 80 ? 'good' : finalScore >= 60 ? 'ok' : finalScore >= 35 ? 'bad' : 'critical'
  return { score: finalScore, grade, tone }
}

