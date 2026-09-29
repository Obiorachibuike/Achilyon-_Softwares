import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Achilyon — Discover. Launch. Trade.',
    short_name: 'Achilyon',
    description: 'Crypto market discovery, token launches and trading analytics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#05070D',
    theme_color: '#05070D',
    orientation: 'portrait-primary',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Trending', url: '/trending' },
      { name: 'Launch a token', url: '/launch' },
      { name: 'Portfolio', url: '/portfolio' },
    ],
  }
}
