import type { Metadata } from 'next'
import { LaunchWizard } from '@/features/launch/LaunchWizard'

export const metadata: Metadata = {
  title: 'Launch a token',
  description: 'Launch a token on a fair bonding curve in six guided steps — transparent pricing, capped creator allocation and automatic DEX migration.',
  alternates: { canonical: '/launch' },
}

export default function Page() {
  return <LaunchWizard />
}
