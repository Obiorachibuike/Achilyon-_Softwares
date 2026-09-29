import type { Metadata } from 'next'
import { AlertsView } from '@/features/alerts/AlertsView'

export const metadata: Metadata = { title: 'Alerts', robots: { index: false } }

export default function Page() {
  return <AlertsView />
}
