import type { Metadata } from 'next'
import { ModerationConsole } from '@/features/admin/ModerationConsole'

export const metadata: Metadata = { title: 'Moderation', robots: { index: false, follow: false } }

export default function Page() {
  return <ModerationConsole />
}
