import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { detectAddressKind } from '@/lib/blockchain/chains'
import { shortAddress } from '@/lib/format'
import { ProfileView } from '@/features/profile/ProfileView'

type Props = { params: Promise<{ address: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params
  return { title: `Profile ${shortAddress(address)}`, robots: { index: false } }
}

export default async function Page({ params }: Props) {
  const { address } = await params
  if (!detectAddressKind(address)) notFound()
  return <ProfileView address={address} />
}
