'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { ThemedCard, ThemedButton } from '@/components/ui/themed'

export function GameDisabledOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <ThemedCard className="max-w-md w-full p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-white">Blackjack Şu Anda Kapalı</h2>
        <p className="text-white/70 text-sm">
          Blackjack oyunu geçici olarak devre dışı bırakılmıştır. Lütfen daha sonra tekrar deneyin.
        </p>
        <Link href="/games">
          <ThemedButton className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Oyunlara Dön
          </ThemedButton>
        </Link>
      </ThemedCard>
    </div>
  )
}
