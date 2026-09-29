import type { Metadata } from 'next'
import { SettingsView } from '@/features/profile/SettingsView'

export const metadata: Metadata = { title: 'Settings', robots: { index: false } }

export default function Page() {
  return <SettingsView />
}
