import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oyunlar',
  description: 'Blackjack, rulet, mayın tarlası ve daha fazla heyecan verici oyunlarla puan kazan! Strateji ve şansını kullanarak ödüller kazan.',
  keywords: ['blackjack', 'rulet', 'mayın tarlası', 'online oyun', 'puan kazan', 'ücretsiz oyun'],
  openGraph: {
    title: 'Oyunlar',
    description: 'Blackjack, rulet, mayın tarlası ve daha fazla heyecan verici oyunlarla puan kazan!',
  },
}

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
