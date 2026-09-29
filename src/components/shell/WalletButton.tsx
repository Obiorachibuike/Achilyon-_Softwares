'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FlaskConical, LogOut, Receipt, Settings, Shield, User, Wallet, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/token/CopyButton'
import { useWallet } from '@/stores/wallet'
import { shortAddress } from '@/lib/format'
import { networkByEvmId } from '@/lib/blockchain/chains'
import { errorMessage } from '@/lib/api/client'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/cn'

export function WalletButton({ className }: { className?: string }) {
  const { status, address, isDemo, evmChainId, session, signingIn, openModal, disconnect, ensureSession } = useWallet()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (status !== 'connected' || !address) {
    return (
      <Button variant="primary" size="sm" onClick={openModal} loading={status === 'connecting'} className={cn('h-9 px-3.5', className)}>
        {status !== 'connecting' && <Wallet className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}</span>
        <span className="sm:hidden">{status === 'connecting' ? '…' : 'Connect'}</span>
      </Button>
    )
  }

  const network = evmChainId ? networkByEvmId(evmChainId) : undefined
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 text-sm hover:bg-white/[0.06]">
        <span className={cn('grid h-5 w-5 place-items-center rounded-full', isDemo ? 'bg-[#A78BFA]/20 text-[#C4B5FD]' : 'bg-up/15 text-up')}>
          {isDemo ? <FlaskConical className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-up" />}
        </span>
        <span className="font-mono text-[12.5px]">{shortAddress(address)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-subtle" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-72 animate-pop rounded-2xl border border-line-strong bg-elevated p-2 shadow-2xl shadow-black/50">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{isDemo ? 'Demo wallet · simulated funds' : network ? `Connected · ${network.name}` : `Connected · chain ${evmChainId ?? '?'}`}</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-mono text-sm">{shortAddress(address, 6)}</span>
              <CopyButton value={address} label="Copy wallet address" />
            </div>
            <div className="mt-2 text-xs">
              {session ? (
                <span className="inline-flex items-center gap-1 text-up"><Shield className="h-3 w-3" /> Signed in{session.role === 'admin' ? ' · admin' : ''}</span>
              ) : (
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={async () => {
                    try { await ensureSession(); toast.success('Signed in') } catch (e) { toast.error('Sign-in failed', errorMessage(e)) }
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                >
                  <KeyRound className="h-3 w-3" /> {signingIn ? 'Check your wallet…' : 'Sign in to comment & sync'}
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 space-y-0.5" onClick={() => setOpen(false)}>
            <MenuLink href={`/profile/${address}`} icon={<User className="h-4 w-4" />}>Profile</MenuLink>
            <MenuLink href="/portfolio" icon={<Wallet className="h-4 w-4" />}>Portfolio</MenuLink>
            <MenuLink href="/transactions" icon={<Receipt className="h-4 w-4" />}>Transactions</MenuLink>
            <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />}>Settings</MenuLink>
            {session?.role === 'admin' && <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />}>Moderation</MenuLink>}
            <button type="button" role="menuitem" onClick={() => void disconnect()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#FCA5A5] hover:bg-down/10">
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/[0.05] hover:text-fg">
      {icon} {children}
    </Link>
  )
}
