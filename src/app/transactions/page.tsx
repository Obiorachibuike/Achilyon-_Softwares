import type { Metadata } from 'next'
import { TransactionsView } from '@/features/portfolio/TransactionsView'

export const metadata: Metadata = { title: 'Transactions', robots: { index: false } }

export default function Page() {
  return <TransactionsView />
}
