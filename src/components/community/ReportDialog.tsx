'use client'
import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { api, errorMessage } from '@/lib/api/client'
import { useWallet } from '@/stores/wallet'
import { toast } from '@/stores/toast'

export type ReportTarget = { type: 'token' | 'comment' | 'account'; id: string; label: string }

const REASONS = [
  { value: 'scam', label: 'Scam or rug pull' },
  { value: 'impersonation', label: 'Impersonates another project' },
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive or abusive' },
  { value: 'other', label: 'Other' },
] as const

/** Report flow shared by tokens, comments and profiles. Requires sign-in. */
export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('scam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wallet = useWallet()

  const submit = async () => {
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      if (wallet.status !== 'connected') {
        wallet.openModal()
        throw new Error('Connect a wallet to submit reports')
      }
      const session = await wallet.ensureSession()
      if (!session) throw new Error('Sign-in was cancelled')
      await api.post('/api/reports', { targetType: target.type, targetId: target.id, reason, details })
      toast.success('Report submitted', 'Moderators will review it. Thank you for keeping Achilyon safe.')
      setDetails('')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onClose={onClose} title={`Report ${target?.type ?? ''}`} description={target?.label}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="label mb-1">Reason</legend>
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[#3B82F6]" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <Field label="Details (optional)" htmlFor="report-details" hint={`${details.length}/500`}>
          <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value.slice(0, 500))} rows={3} className="input resize-none" placeholder="Links or context that help moderators verify the report" />
        </Field>
        {error && <p className="text-sm text-down" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={busy}>Submit report</Button>
        </div>
      </form>
    </Dialog>
  )
}
