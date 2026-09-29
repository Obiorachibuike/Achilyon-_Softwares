'use client'
import { ChevronRight, FlaskConical, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Notice } from '@/components/ui/feedback'
import { useWallet } from '@/stores/wallet'
import { cn } from '@/lib/cn'

export function WalletModal() {
  const { modalOpen, closeModal, connectors, connect, status, connectorId, error } = useWallet()
  return (
    <Dialog open={modalOpen} onClose={closeModal} title="Connect a wallet" description="Achilyon never asks for your seed phrase or private key.">
      <ul className="space-y-2">
        {connectors.map((c) => {
          const busy = status === 'connecting' && connectorId === c.id
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={!c.available || status === 'connecting'}
                onClick={() => void connect(c.id)}
                className={cn('flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition-colors', c.available ? 'hover:border-primary/40 hover:bg-white/[0.03]' : 'cursor-not-allowed opacity-55')}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.05]">
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- EIP-6963 icons are data: URIs provided by the wallet
                    <img src={c.icon} alt="" className="h-6 w-6" />
                  ) : c.kind === 'mock' ? <FlaskConical className="h-5 w-5 text-[#C4B5FD]" /> : <Wallet className="h-5 w-5 text-muted" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {c.kind === 'mock' ? 'Simulated funds — try every flow safely' : c.available ? 'Detected in your browser' : c.unavailableReason}
                  </span>
                </span>
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : c.available && <ChevronRight className="h-4 w-4 text-subtle" />}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <Notice tone="danger" className="mt-4" title="Wallet connection failed">{error}</Notice>}
      <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Connecting only shares your public address. Signing in asks you to sign a message — it never moves funds.
      </p>
    </Dialog>
  )
}
