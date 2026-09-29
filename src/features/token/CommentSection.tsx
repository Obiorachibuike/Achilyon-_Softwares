'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Flag, Heart, MessageCircle, Clock } from 'lucide-react'
import type { Comment, MarketToken } from '@/types'
import { useComments } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { api, apiRequest, errorMessage } from '@/lib/api/client'
import { shortAddress, timeAgo } from '@/lib/format'
import { useWallet } from '@/stores/wallet'
import { toast } from '@/stores/toast'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorState } from '@/components/ui/feedback'
import { ReportDialog, type ReportTarget } from '@/components/community/ReportDialog'
import { cn } from '@/lib/cn'

type Sort = 'new' | 'top' | 'old'
const MAX = 500

/**
 * Token discussion: threaded (one level) comments, likes, reports and sort.
 * Content is plain text rendered by React (escaped) and sanitized server-side.
 */
export function CommentSection({ t }: { t: MarketToken }) {
  const [sort, setSort] = useState<Sort>('new')
  const [report, setReport] = useState<ReportTarget | null>(null)
  const { data, isLoading, error, refetch } = useComments(t.token.chain, t.token.address, sort)
  const now = useNow(30_000)
  const session = useWallet((s) => s.session)

  const { roots, replies } = useMemo(() => {
    const roots: Comment[] = []
    const replies = new Map<string, Comment[]>()
    for (const c of data ?? []) {
      if (c.parentId) replies.set(c.parentId, [...(replies.get(c.parentId) ?? []), c])
      else roots.push(c)
    }
    for (const list of replies.values()) list.sort((a, b) => a.createdAt - b.createdAt)
    return { roots, replies }
  }, [data])

  return (
    <div className="p-4">
      <Composer t={t} />
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-muted">{roots.length} {roots.length === 1 ? 'thread' : 'threads'}</span>
        <Segmented label="Sort comments" size="xs" value={sort} onChange={setSort} options={[{ value: 'new', label: 'Newest' }, { value: 'top', label: 'Top' }, { value: 'old', label: 'Oldest' }]} />
      </div>
      <div className="mt-3">
        {error && !data ? (
          <ErrorState title="Couldn't load comments" message={errorMessage(error)} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : roots.length === 0 ? (
          <EmptyState icon={<MessageCircle className="h-5 w-5" />} title="No comments yet" description="Start the conversation — be respectful and never share private keys." />
        ) : (
          <ul className="space-y-4">
            {roots.map((c) => (
              <li key={c.id}>
                <CommentItem c={c} t={t} now={now} mine={session?.address.toLowerCase() === c.author.toLowerCase()} onReport={setReport} />
                {(replies.get(c.id)?.length ?? 0) > 0 && (
                  <ul className="ml-6 mt-3 space-y-3 border-l border-line pl-4">
                    {replies.get(c.id)?.map((r) => <li key={r.id}><CommentItem c={r} t={t} now={now} mine={session?.address.toLowerCase() === r.author.toLowerCase()} onReport={setReport} isReply /></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  )
}

function useRequireSession() {
  const wallet = useWallet()
  return async () => {
    if (wallet.status !== 'connected') {
      wallet.openModal()
      return null
    }
    return wallet.ensureSession()
  }
}

function Composer({ t, parentId = null, onDone, autoFocus }: { t: MarketToken; parentId?: string | null; onDone?: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const qc = useQueryClient()
  const requireSession = useRequireSession()
  const connected = useWallet((s) => s.status === 'connected')

  const submit = async () => {
    const content = text.trim()
    if (!content) return
    setBusy(true)
    setErr(null)
    try {
      const session = await requireSession()
      if (!session) return
      const res = await apiRequest<Comment>('/api/comments', { method: 'POST', json: { chain: t.token.chain, address: t.token.address, content, parentId } })
      setText('')
      if (typeof res.meta?.notice === 'string') toast.success('Comment submitted', res.meta.notice)
      await qc.invalidateQueries({ queryKey: ['comments', t.token.chain] })
      onDone?.()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <label htmlFor={`composer-${parentId ?? 'root'}`} className="sr-only">{parentId ? 'Write a reply' : 'Write a comment'}</label>
      <textarea
        id={`composer-${parentId ?? 'root'}`}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit() }}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
        placeholder={parentId ? 'Write a reply…' : connected ? `Share your thoughts on ${t.token.symbol}…` : 'Connect a wallet to join the discussion'}
        className="input resize-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn('num text-[11px]', text.length > MAX - 40 ? 'text-warn' : 'text-subtle')}>{text.length}/{MAX}</span>
        <div className="flex gap-2">
          {onDone && <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>}
          <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!text.trim()}>{parentId ? 'Reply' : connected ? 'Post' : 'Connect & post'}</Button>
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-down" role="alert">{err}</p>}
    </form>
  )
}

function CommentItem({ c, t, now, mine, onReport, isReply = false }: { c: Comment; t: MarketToken; now: number; mine: boolean; onReport: (r: ReportTarget) => void; isReply?: boolean }) {
  const [replying, setReplying] = useState(false)
  const [liked, setLiked] = useState(c.likedByMe)
  const [likes, setLikes] = useState(c.likes)
  const requireSession = useRequireSession()
  const creator = t.token.creator?.toLowerCase() === c.author.toLowerCase()

  const like = async () => {
    const session = await requireSession()
    if (!session) return
    const prev = { liked, likes }
    setLiked(!liked)
    setLikes(likes + (liked ? -1 : 1))
    try {
      await api.post(`/api/comments/${c.id}/like`)
    } catch (e) {
      setLiked(prev.liked)
      setLikes(prev.likes)
      toast.error('Could not update like', errorMessage(e))
    }
  }

  return (
    <article className="group">
      <header className="flex items-center gap-2 text-xs">
        <Link href={`/profile/${c.author}`} className="font-mono font-medium text-fg hover:text-primary">{shortAddress(c.author)}</Link>
        {creator && <span className="rounded bg-gold/15 px-1.5 py-px text-[10px] font-semibold text-gold">Creator</span>}
        {mine && <span className="rounded bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">You</span>}
        <time className="text-subtle" dateTime={new Date(c.createdAt).toISOString()}>{timeAgo(c.createdAt, now)}</time>
        {c.status === 'flagged' && <span className="inline-flex items-center gap-1 text-warn"><Clock className="h-3 w-3" aria-hidden />Pending review</span>}
      </header>
      <p className="mt-1 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-fg/90">{c.content}</p>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
        <button type="button" onClick={() => void like()} aria-pressed={liked} className={cn('inline-flex items-center gap-1 hover:text-fg', liked && 'text-down')}>
          <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} aria-hidden /> <span className="num">{likes}</span><span className="sr-only">{liked ? 'Unlike' : 'Like'}</span>
        </button>
        {!isReply && (
          <button type="button" onClick={() => setReplying((v) => !v)} className="inline-flex items-center gap-1 hover:text-fg">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Reply
          </button>
        )}
        {!mine && (
          <button type="button" onClick={() => onReport({ type: 'comment', id: c.id, label: `Comment by ${shortAddress(c.author)}` })} className="inline-flex items-center gap-1 opacity-70 hover:text-fg group-hover:opacity-100">
            <Flag className="h-3 w-3" aria-hidden /> Report
          </button>
        )}
      </div>
      {replying && <div className="mt-3"><Composer t={t} parentId={c.id} onDone={() => setReplying(false)} autoFocus /></div>}
    </article>
  )
}
