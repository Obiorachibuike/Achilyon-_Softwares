import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnalyzerView } from '@/features/analyzer/AnalyzerView'

export const metadata: Metadata = {
  title: 'Contract analyzer',
  description: 'Check any EVM or Solana token for honeypots, taxes, mint authority, holder concentration and liquidity risk.',
  alternates: { canonical: '/analyzer' },
}

export default function Page() {
  return <Suspense><AnalyzerView /></Suspense>
}
